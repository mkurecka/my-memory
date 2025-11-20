import { Hono } from 'hono';
import type { Env, AuthRequest, AuthResponse } from '../types';
import { generateId } from '../utils/id';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateJWT } from '../utils/jwt';

const auth = new Hono<{ Bindings: Env }>();

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

    // Extract userId from token (simplified - should verify token)
    const token = authHeader.replace('Bearer ', '');

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

export default auth;
