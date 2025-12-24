import { Hono } from 'hono';
import type { Env } from '../types';
import { dashboardPage } from '../templates/pages/dashboard';
import { unifiedMemoriesPage } from '../templates/pages/memories-unified';
import { aiContentPage } from '../templates/pages/ai-content';
import { aiImagesPage } from '../templates/pages/ai-images';
import { webhooksPage } from '../templates/pages/webhooks';
import { profilesPage } from '../templates/pages/profiles';
import { addContentPage } from '../templates/pages/add-content';
import { generateImagePage } from '../templates/pages/generate-image';
import { claudeSessionsPage } from '../templates/pages/claude-sessions';
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
 * AI-generated images gallery page
 */
router.get('/ai-images', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    // Get count of images from R2
    const listed = await c.env.STORAGE.list({ prefix: 'ai-images/', limit: 1000 });
    const count = listed.objects.length;

    const html = aiImagesPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('AI Images page error:', error);
    return c.html(errorPage('AI Images Error', error.message), 500);
  }
});

/**
 * GET /dashboard/webhooks
 * Webhook events history page
 */
router.get('/webhooks', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM webhook_events'
    ).first<any>();
    const count = result?.count || 0;

    const html = webhooksPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Webhooks page error:', error);
    return c.html(errorPage('Webhooks Error', error.message), 500);
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
 * GET /dashboard/generate-image
 * Generate AI image form page
 */
router.get('/generate-image', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const html = generateImagePage({ apiBase, userId: DEFAULT_USER_ID });
    return c.html(html);
  } catch (error: any) {
    console.error('Generate Image page error:', error);
    return c.html(errorPage('Generate Image Error', error.message), 500);
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
 * GET /dashboard/profiles
 * Airtable profiles and websites page
 */
router.get('/profiles', async (c) => {
  try {
    const apiBase = c.env.APP_URL;
    const airtable = new AirtableService(c.env);
    const configured = airtable.isConfigured();
    const airtableBaseId = c.env.AIRTABLE_BASE_ID || '';

    let profilesCount = 0;
    let websitesCount = 0;

    if (configured) {
      try {
        const [profiles, websites] = await Promise.all([
          airtable.listUserProfiles(),
          airtable.listWebsites()
        ]);
        profilesCount = profiles.length;
        websitesCount = websites.length;
      } catch (error) {
        console.error('Error fetching Airtable data:', error);
      }
    }

    const html = profilesPage({ profilesCount, websitesCount, apiBase, configured, airtableBaseId });
    return c.html(html);

  } catch (error: any) {
    console.error('Profiles page error:', error);
    return c.html(errorPage('Profiles Error', error.message), 500);
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
