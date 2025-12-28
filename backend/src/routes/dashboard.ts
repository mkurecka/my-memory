import { Hono } from 'hono';
import type { Env } from '../types';
import { dashboardPage } from '../templates/pages/dashboard';
import { unifiedMemoriesPage } from '../templates/pages/memories-unified';
import { aiContentPage } from '../templates/pages/ai-content';
import { aiImagesPage } from '../templates/pages/ai-images';
import { addContentPage } from '../templates/pages/add-content';
import { generateCarouselPage } from '../templates/pages/generate-carousel';
import { claudeSessionsPage } from '../templates/pages/claude-sessions';
import { settingsPage } from '../templates/pages/settings';
import { AirtableService } from '../services/airtable';

const router = new Hono<{ Bindings: Env }>();

/**
 * GET /dashboard
 * Main dashboard overview page
 */
router.get('/', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    
    const [postsCount, memoryCount, webhooksCount, usersCount, tweetsCount, videosCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM memory').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM webhook_events').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE type = ?').bind('tweet').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE type = ?').bind('youtube_video').first<any>(),
    ]);

    const stats = {
      posts: {
        total: postsCount?.count || 0,
        tweets: tweetsCount?.count || 0,
        videos: videosCount?.count || 0,
        memory: memoryCount?.count || 0,
      },
      webhooks: {
        total: webhooksCount?.count || 0,
      },
      users: {
        total: usersCount?.count || 0,
      },
    };

    const html = dashboardPage({ stats, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return c.html(errorPage('Dashboard Error', error.message), 500);
  }
});

/**
 * GET /dashboard/memories
 * Unified memories page - all saved items (memories, tweets, videos)
 */
router.get('/memories', async (c) => {
  try {
    const apiBase = c.env.APP_URL;

    const [memoryCount, tweetsCount, videosCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM memory').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE type = ?').bind('tweet').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE type = ?').bind('youtube_video').first<any>(),
    ]);

    const counts = {
      memories: memoryCount?.count || 0,
      tweets: tweetsCount?.count || 0,
      videos: videosCount?.count || 0,
      total: (memoryCount?.count || 0) + (tweetsCount?.count || 0) + (videosCount?.count || 0),
    };

    const html = unifiedMemoriesPage({ counts, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Memories page error:', error);
    return c.html(errorPage('Memories Error', error.message), 500);
  }
});

/**
 * GET /dashboard/ai-content
 * AI-generated content listing page
 */
router.get('/ai-content', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE generated_output IS NOT NULL AND generated_output != ?'
    ).bind('').first<any>();
    const count = result?.count || 0;

    const html = aiContentPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('AI Content page error:', error);
    return c.html(errorPage('AI Content Error', error.message), 500);
  }
});

/**
 * GET /dashboard/ai-images
 * Unified AI Images page - generate new images and view gallery
 */
router.get('/ai-images', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    // Get count of images from R2
    const listed = await c.env.STORAGE.list({ prefix: 'ai-images/', limit: 1000 });
    const count = listed.objects.length;

    const html = aiImagesPage({ count, apiBase, userId: DEFAULT_USER_ID });
    return c.html(html);

  } catch (error: any) {
    console.error('AI Images page error:', error);
    return c.html(errorPage('AI Images Error', error.message), 500);
  }
});

// Default user ID for dashboard forms (can be customized per user in future)
const DEFAULT_USER_ID = 'dashboard_user';


/**
 * GET /dashboard/add
 * Add content form page (memory, tweet, YouTube)
 */
router.get('/add', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const html = addContentPage({ apiBase, userId: DEFAULT_USER_ID });
    return c.html(html);
  } catch (error: any) {
    console.error('Add Content page error:', error);
    return c.html(errorPage('Add Content Error', error.message), 500);
  }
});

/**
 * GET /dashboard/generate-carousel
 * Generate Instagram carousel page
 */
router.get('/generate-carousel', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const html = generateCarouselPage({ apiBase });
    return c.html(html);
  } catch (error: any) {
    console.error('Generate Carousel page error:', error);
    return c.html(errorPage('Generate Carousel Error', error.message), 500);
  }
});

/**
 * GET /dashboard/claude-sessions
 * Claude Code sessions page
 */
router.get('/claude-sessions', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM claude_sessions').first<any>();
    const count = result?.count || 0;

    const html = claudeSessionsPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Claude Sessions page error:', error);
    return c.html(errorPage('Claude Sessions Error', error.message), 500);
  }
});

/**
 * GET /dashboard/settings
 * Unified settings page - AI models, webhooks, and Airtable configuration
 */
router.get('/settings', async (c) => {
  try {
    const apiBase = c.env.APP_URL;

    // Get current settings from KV
    const settingsJson = await c.env.CACHE.get('app:settings');
    const settings = settingsJson ? JSON.parse(settingsJson) : {};

    // Prepare display settings with array-based models
    const displaySettings = {
      textModels: settings.textModels || [],
      imageModels: settings.imageModels || [],
      videoModels: settings.videoModels || [],
      imageGenModels: settings.imageGenModels || [],
      openrouterApiKey: settings.openrouterApiKey
        ? '••••••••' + settings.openrouterApiKey.slice(-4)
        : undefined,
    };

    // Get webhooks count for Settings tab
    const webhooksResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM webhook_events').first<any>();
    const webhooksCount = webhooksResult?.count || 0;

    // Check if Airtable is configured
    const airtable = new AirtableService(c.env);
    const airtableConfigured = airtable.isConfigured();
    const airtableBaseId = c.env.AIRTABLE_BASE_ID || '';

    const html = settingsPage({
      apiBase,
      settings: displaySettings,
      webhooksCount,
      airtableConfigured,
      airtableBaseId
    });
    return c.html(html);

  } catch (error: any) {
    console.error('Settings page error:', error);
    return c.html(errorPage('Settings Error', error.message), 500);
  }
});

/**
 * Error page helper
 */
function errorPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
        .error { background: #fee; color: #c00; padding: 1rem; border-radius: 8px; }
        a { color: #065f4a; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="error">
        <strong>Error:</strong> ${message || 'An unexpected error occurred'}
      </div>
      <p style="margin-top: 1rem;">
        <a href="/dashboard">← Back to Dashboard</a>
      </p>
    </body>
    </html>
  `;
}

export default router;
