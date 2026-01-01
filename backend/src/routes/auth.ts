import { Hono } from 'hono';
import type { Env, AuthRequest, AuthResponse } from '../types';
import { generateId } from '../utils/id';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateJWT, verifyJWT } from '../utils/jwt';

const auth = new Hono<{ Bindings: Env }>();

// Generate a secure API key
function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  // Make URL-safe and prefix with 'mm_' for My Memory
  return 'mm_' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Auth middleware for protected endpoints
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ success: false, error: 'No authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  // Check if it's an API key (starts with 'mm_')
  if (token.startsWith('mm_')) {
    const user: any = await c.env.DB
      .prepare('SELECT id, email, subscription_tier FROM users WHERE api_key = ?')
      .bind(token)
      .first();

    if (!user) {
      return c.json({ success: false, error: 'Invalid API key' }, 401);
    }

    c.set('userId', user.id);
    c.set('userEmail', user.email);
    c.set('userTier', user.subscription_tier);
    await next();
    return;
  }

  // Otherwise treat as JWT
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', payload.userId);
  c.set('userEmail', payload.email);
  c.set('userTier', payload.tier);
  await next();
}

// POST /api/auth/register
auth.post('/register', async (c) => {
  try {
    const { email, password }: AuthRequest = await c.req.json();

    // Validation
    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Email and password are required',
      }, 400);
    }

    if (password.length < 8) {
      return c.json({
        success: false,
        error: 'Password must be at least 8 characters',
      }, 400);
    }

    // Check if user already exists
    const existing = await c.env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return c.json({
        success: false,
        error: 'Email already registered',
      }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = generateId();
    const now = Date.now();

    await c.env.DB
      .prepare(`
        INSERT INTO users (id, email, password_hash, created_at, subscription_tier, api_usage_count)
        VALUES (?, ?, ?, ?, 'free', 0)
      `)
      .bind(userId, email, passwordHash, now)
      .run();

    // Generate JWT
    const token = await generateJWT({
      userId,
      email,
      tier: 'free',
    }, c.env.JWT_SECRET);

    // Store session in KV
    await c.env.SESSIONS.put(`session:${userId}`, token, {
      expirationTtl: 86400, // 24 hours
    });

    const response: AuthResponse = {
      success: true,
      userId,
      token,
      user: {
        email,
        subscription_tier: 'free',
      },
    };

    return c.json(response, 201);
  } catch (error: any) {
    console.error('Registration error:', error);
    return c.json({
      success: false,
      error: error.message || 'Registration failed',
    }, 500);
  }
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const { email, password }: AuthRequest = await c.req.json();

    // Validation
    if (!email || !password) {
      return c.json({
        success: false,
        error: 'Email and password are required',
      }, 400);
    }

    // Find user
    const user = await c.env.DB
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<any>();

    if (!user) {
      return c.json({
        success: false,
        error: 'Invalid credentials',
      }, 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({
        success: false,
        error: 'Invalid credentials',
      }, 401);
    }

    // Update last active
    await c.env.DB
      .prepare('UPDATE users SET last_active = ? WHERE id = ?')
      .bind(Date.now(), user.id)
      .run();

    // Generate JWT
    const token = await generateJWT({
      userId: user.id,
      email: user.email,
      tier: user.subscription_tier,
    }, c.env.JWT_SECRET);

    // Store session in KV
    await c.env.SESSIONS.put(`session:${user.id}`, token, {
      expirationTtl: 86400, // 24 hours
    });

    // Parse settings
    let settings = {};
    if (user.settings_json) {
      try {
        settings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    const response: AuthResponse = {
      success: true,
      userId: user.id,
      token,
      user: {
        email: user.email,
        subscription_tier: user.subscription_tier,
        settings_json: JSON.stringify(settings),
      },
    };

    return c.json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({
      success: false,
      error: error.message || 'Login failed',
    }, 500);
  }
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({
        success: false,
        error: 'No authorization header',
      }, 401);
    }

    // For now, just return success
    // In production, you'd verify the token and delete the session

    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      error: error.message || 'Logout failed',
    }, 500);
  }
});

// POST /api/auth/api-key - Generate or regenerate API key
auth.post('/api-key', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const apiKey = generateApiKey();
    const now = Date.now();

    await c.env.DB
      .prepare('UPDATE users SET api_key = ?, api_key_created_at = ? WHERE id = ?')
      .bind(apiKey, now, userId)
      .run();

    return c.json({
      success: true,
      apiKey,
      message: 'API key generated successfully. Store it securely - it will only be shown once.',
      createdAt: now,
    });
  } catch (error: any) {
    console.error('API key generation error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to generate API key',
    }, 500);
  }
});

// GET /api/auth/api-key - Check if API key exists (does not reveal the key)
auth.get('/api-key', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const user: any = await c.env.DB
      .prepare('SELECT api_key, api_key_created_at FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    return c.json({
      success: true,
      hasApiKey: !!user.api_key,
      createdAt: user.api_key_created_at || null,
      // Show partial key for identification
      keyPrefix: user.api_key ? user.api_key.substring(0, 10) + '...' : null,
    });
  } catch (error: any) {
    console.error('Get API key status error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get API key status',
    }, 500);
  }
});

// DELETE /api/auth/api-key - Revoke API key
auth.delete('/api-key', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    await c.env.DB
      .prepare('UPDATE users SET api_key = NULL, api_key_created_at = NULL WHERE id = ?')
      .bind(userId)
      .run();

    return c.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error('API key revocation error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to revoke API key',
    }, 500);
  }
});

export default auth;
