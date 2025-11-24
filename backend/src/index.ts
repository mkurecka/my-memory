import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types';

// Import routes
import authRoutes from './routes/auth';
import processRoutes from './routes/process';
import postsRoutes from './routes/posts';
import memoryRoutes from './routes/memory';
import settingsRoutes from './routes/settings';
import visualContentRoutes from './routes/visual-content';
import airtableRoutes from './routes/airtable';
import webhookRoutes from './routes/webhook';
import proxyRoutes from './routes/proxy';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow chrome extensions and local file testing
    if (!origin) return '*';
    if (origin.startsWith('chrome-extension://')) return origin;
    if (origin.startsWith('file://')) return origin;
    if (origin === 'null') return 'null'; // For file:// protocol
    return origin; // Allow all for now, tighten in production
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Universal Text Processor API',
    version: c.env.API_VERSION || 'v1',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: Date.now(),
  });
});

app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
  });
});

// Settings Dashboard UI
app.get('/dashboard', (c) => {
  // For now, redirect to a simple dashboard info page
  // The full HTML dashboard is available at /pages/settings-dashboard.html
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #065f4a; }
    .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 20px 0; }
    .endpoint { background: #f5f6f7; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; }
    a { color: #065f4a; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Settings Dashboard API</h1>
  <div class="card">
    <h2>Available Endpoints</h2>
    <p><strong>Settings History:</strong></p>
    <div class="endpoint">GET /api/settings/history</div>
    <br>
    <p><strong>User Profiles (Airtable):</strong></p>
    <div class="endpoint">GET /api/airtable/profiles</div>
    <br>
    <p><strong>User Settings:</strong></p>
    <div class="endpoint">GET /api/settings</div>
  </div>
  <div class="card">
    <h2>Frontend Dashboard</h2>
    <p>A full-featured dashboard UI is available at:</p>
    <div class="endpoint">/pages/settings-dashboard.html</div>
    <br>
    <p><a href="https://github.com/mkurecka/x-post-sender">View on GitHub</a></p>
  </div>
</body>
</html>`);
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/process', processRoutes);
app.route('/api/posts', postsRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/visual-content', visualContentRoutes);
app.route('/api/airtable', airtableRoutes);
app.route('/api/proxy', proxyRoutes);

// Webhook routes (v1 for backward compatibility)
app.route('/api/v1/webhook', webhookRoutes);
app.route('/api/webhook', webhookRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: `Route ${c.req.path} not found`,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
  }, 500);
});

export default app;
