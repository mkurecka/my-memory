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
import searchRoutes from './routes/search';
import dashboardRoutes from './routes/dashboard';
import mobileRoutes from './routes/mobile';
import claudeSessionsRoutes from './routes/claude-sessions';
import exportRoutes from './routes/export';
import tasksRoutes from './routes/tasks';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';
import mcpRoutes from './routes/mcp';
import etsyRoutes from './routes/etsy';
import socialPostsRoutes from './routes/social-posts';

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
    message: 'My Memory 🧠 API',
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

// App-wide settings (stored in KV, no auth required for personal dashboard)
const APP_SETTINGS_KEY = 'app:settings';

app.get('/api/app-settings', async (c) => {
  try {
    const settingsJson = await c.env.CACHE.get(APP_SETTINGS_KEY);
    const settings = settingsJson ? JSON.parse(settingsJson) : {};

    // Mask API key if present
    if (settings.openrouterApiKey) {
      settings.openrouterApiKey = '••••••••' + settings.openrouterApiKey.slice(-4);
    }

    return c.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Get app settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get settings',
    }, 500);
  }
});

app.put('/api/app-settings', async (c) => {
  try {
    const newSettings = await c.req.json();

    // Get current settings
    const currentJson = await c.env.CACHE.get(APP_SETTINGS_KEY);
    const current = currentJson ? JSON.parse(currentJson) : {};

    // Merge settings - now using arrays for model selections
    const merged = {
      ...current,
      // New array-based model settings
      textModels: newSettings.textModels ?? current.textModels ?? [],
      imageModels: newSettings.imageModels ?? current.imageModels ?? [],
      videoModels: newSettings.videoModels ?? current.videoModels ?? [],
      imageGenModels: newSettings.imageGenModels ?? current.imageGenModels ?? [],
    };

    // Only update API key if explicitly provided (not masked)
    if (newSettings.openrouterApiKey && !newSettings.openrouterApiKey.startsWith('••')) {
      merged.openrouterApiKey = newSettings.openrouterApiKey;
    }

    await c.env.CACHE.put(APP_SETTINGS_KEY, JSON.stringify(merged));

    // Return masked version
    const response = { ...merged };
    if (response.openrouterApiKey) {
      response.openrouterApiKey = '••••••••' + response.openrouterApiKey.slice(-4);
    }

    return c.json({
      success: true,
      message: 'Settings saved',
      settings: response,
    });
  } catch (error: any) {
    console.error('Save app settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to save settings',
    }, 500);
  }
});

// API endpoint for extension to get enabled models
app.get('/api/enabled-models', async (c) => {
  try {
    const settingsJson = await c.env.CACHE.get(APP_SETTINGS_KEY);
    const settings = settingsJson ? JSON.parse(settingsJson) : {};

    return c.json({
      success: true,
      models: {
        text: settings.textModels || [],
        image: settings.imageModels || [],
        video: settings.videoModels || [],
        imageGen: settings.imageGenModels || [],
      },
    });
  } catch (error: any) {
    console.error('Get enabled models error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get models',
    }, 500);
  }
});

// Dashboard UI (modular template system)
app.route('/dashboard', dashboardRoutes);

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/process', processRoutes);
app.route('/api/posts', postsRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/visual-content', visualContentRoutes);
app.route('/api/airtable', airtableRoutes);
app.route('/api/etsy', etsyRoutes);
app.route('/api/social-posts', socialPostsRoutes);
app.route('/api/proxy', proxyRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/export', exportRoutes);
app.route('/api/tasks', tasksRoutes);

// Webhook routes (v1 for backward compatibility)
app.route('/api/v1/webhook', webhookRoutes);
app.route('/api/webhook', webhookRoutes);

// Mobile API routes (for iOS Shortcuts / automation)
app.route('/api/mobile', mobileRoutes);

// Claude Code sessions API
app.route('/api/claude', claudeSessionsRoutes);

// Admin routes (protected with X-Admin-Key header)
app.route('/api/admin', adminRoutes);

// Chat routes (RAG-powered conversations)
app.route('/api/chat', chatRoutes);

// MCP routes (Model Context Protocol for Claude Desktop/Code)
app.route('/mcp', mcpRoutes);

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
