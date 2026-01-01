import { verifyJWT } from './jwt';

/**
 * Authentication middleware that supports both JWT tokens and API keys.
 *
 * Usage:
 *   import { createAuthMiddleware } from '../utils/auth-middleware';
 *   route.get('/protected', createAuthMiddleware(), async (c) => { ... });
 *
 * After authentication, the following are available via c.get():
 *   - userId: The authenticated user's ID
 *   - userEmail: The authenticated user's email (if available)
 *   - userTier: The authenticated user's subscription tier
 */
export function createAuthMiddleware() {
  return async function authMiddleware(c: any, next: any) {
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
  };
}

/**
 * Optional authentication middleware - sets user context if authenticated,
 * but allows request to proceed if not.
 */
export function createOptionalAuthMiddleware() {
  return async function optionalAuthMiddleware(c: any, next: any) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      await next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if it's an API key (starts with 'mm_')
    if (token.startsWith('mm_')) {
      const user: any = await c.env.DB
        .prepare('SELECT id, email, subscription_tier FROM users WHERE api_key = ?')
        .bind(token)
        .first();

      if (user) {
        c.set('userId', user.id);
        c.set('userEmail', user.email);
        c.set('userTier', user.subscription_tier);
      }
      await next();
      return;
    }

    // Otherwise treat as JWT
    try {
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      if (payload) {
        c.set('userId', payload.userId);
        c.set('userEmail', payload.email);
        c.set('userTier', payload.tier);
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }

    await next();
  };
}
