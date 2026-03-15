import { Hono } from 'hono';
import type { Env } from '../types';
import { dashboardPage } from '../templates/pages/dashboard';
import { unifiedMemoriesPage } from '../templates/pages/memories-unified';
import { addContentPage } from '../templates/pages/add-content';
import { workSessionsPage } from '../templates/pages/work-sessions';
import { settingsPage } from '../templates/pages/settings';
import { chatPage } from '../templates/pages/chat';
import { insightsPage } from '../templates/pages/insights';

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
 * GET /dashboard/work-sessions
 * Work sessions page - coding session history and progress
 */
router.get('/work-sessions', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM work_sessions').first<any>();
    const count = result?.count || 0;

    const html = workSessionsPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Work Sessions page error:', error);
    return c.html(errorPage('Work Sessions Error', error.message), 500);
  }
});

/**
 * GET /dashboard/settings
 * Settings page - AI models and webhooks configuration
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

    const html = settingsPage({
      apiBase,
      settings: displaySettings,
      webhooksCount,
    });
    return c.html(html);

  } catch (error: any) {
    console.error('Settings page error:', error);
    return c.html(errorPage('Settings Error', error.message), 500);
  }
});

/**
 * GET /dashboard/chat
 * RAG-powered chat page for querying memories
 */
router.get('/chat', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM chat_conversations').first<any>();
    const conversationCount = result?.count || 0;

    const html = chatPage({ apiBase, conversationCount });
    return c.html(html);
  } catch (error: any) {
    console.error('Chat page error:', error);
    return c.html(errorPage('Chat Error', error.message), 500);
  }
});

/**
 * GET /dashboard/insights
 * AI-powered memory insights and content suggestions
 */
router.get('/insights', async (c) => {
  try {
    const apiBase = c.env.APP_URL;

    // Get analysis status counts from both memory and posts tables
    const [
      memoryAnalyzedResult,
      memoryPendingResult,
      postsAnalyzedResult,
      postsPendingResult
    ] = await Promise.all([
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM memory WHERE context_json LIKE '%\"analysis\":%'"
      ).first<any>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM memory WHERE context_json IS NULL OR context_json NOT LIKE '%\"analysis\":%'"
      ).first<any>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE context_json LIKE '%\"analysis\":%'"
      ).first<any>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE (context_json IS NULL OR context_json NOT LIKE '%\"analysis\":%') AND original_text IS NOT NULL AND original_text != ''"
      ).first<any>()
    ]);

    const analyzedResult = {
      count: (memoryAnalyzedResult?.count || 0) + (postsAnalyzedResult?.count || 0)
    };
    const pendingResult = {
      count: (memoryPendingResult?.count || 0) + (postsPendingResult?.count || 0)
    };

    const html = insightsPage({
      apiBase,
      analyzedCount: analyzedResult?.count || 0,
      pendingCount: pendingResult?.count || 0
    });
    return c.html(html);

  } catch (error: any) {
    console.error('Insights page error:', error);
    return c.html(errorPage('Insights Error', error.message), 500);
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
