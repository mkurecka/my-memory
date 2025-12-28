import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

/**
 * GET /export/memories
 * Export all memories as JSON
 */
router.get('/memories', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM memory ORDER BY created_at DESC'
    ).all();

    const data = {
      type: 'memories',
      exported_at: new Date().toISOString(),
      count: result.results?.length || 0,
      data: result.results || [],
    };

    return c.json(data, 200, {
      'Content-Disposition': `attachment; filename="memories-export-${Date.now()}.json"`,
    });
  } catch (error: any) {
    console.error('Memory export error:', error);
    return c.json({ error: 'Failed to export memories', message: error.message }, 500);
  }
});

/**
 * GET /export/tweets
 * Export all tweets as JSON
 */
router.get('/tweets', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE type = ? ORDER BY created_at DESC'
    ).bind('tweet').all();

    const data = {
      type: 'tweets',
      exported_at: new Date().toISOString(),
      count: result.results?.length || 0,
      data: result.results || [],
    };

    return c.json(data, 200, {
      'Content-Disposition': `attachment; filename="tweets-export-${Date.now()}.json"`,
    });
  } catch (error: any) {
    console.error('Tweets export error:', error);
    return c.json({ error: 'Failed to export tweets', message: error.message }, 500);
  }
});

/**
 * GET /export/videos
 * Export all YouTube videos as JSON
 */
router.get('/videos', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE type = ? ORDER BY created_at DESC'
    ).bind('youtube_video').all();

    const data = {
      type: 'videos',
      exported_at: new Date().toISOString(),
      count: result.results?.length || 0,
      data: result.results || [],
    };

    return c.json(data, 200, {
      'Content-Disposition': `attachment; filename="videos-export-${Date.now()}.json"`,
    });
  } catch (error: any) {
    console.error('Videos export error:', error);
    return c.json({ error: 'Failed to export videos', message: error.message }, 500);
  }
});

/**
 * GET /export/ai-content
 * Export all AI-generated content as JSON
 */
router.get('/ai-content', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE generated_output IS NOT NULL AND generated_output != ? ORDER BY created_at DESC'
    ).bind('').all();

    const data = {
      type: 'ai_content',
      exported_at: new Date().toISOString(),
      count: result.results?.length || 0,
      data: result.results || [],
    };

    return c.json(data, 200, {
      'Content-Disposition': `attachment; filename="ai-content-export-${Date.now()}.json"`,
    });
  } catch (error: any) {
    console.error('AI content export error:', error);
    return c.json({ error: 'Failed to export AI content', message: error.message }, 500);
  }
});

/**
 * GET /export/all
 * Export all data combined as JSON
 */
router.get('/all', async (c) => {
  try {
    const [memories, posts, sessions] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM memory ORDER BY created_at DESC').all(),
      c.env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC').all(),
      c.env.DB.prepare('SELECT * FROM claude_sessions ORDER BY created_at DESC').all(),
    ]);

    const data = {
      type: 'full_export',
      exported_at: new Date().toISOString(),
      counts: {
        memories: memories.results?.length || 0,
        posts: posts.results?.length || 0,
        claude_sessions: sessions.results?.length || 0,
        total: (memories.results?.length || 0) + (posts.results?.length || 0) + (sessions.results?.length || 0),
      },
      data: {
        memories: memories.results || [],
        posts: posts.results || [],
        claude_sessions: sessions.results || [],
      },
    };

    return c.json(data, 200, {
      'Content-Disposition': `attachment; filename="full-export-${Date.now()}.json"`,
    });
  } catch (error: any) {
    console.error('Full export error:', error);
    return c.json({ error: 'Failed to export data', message: error.message }, 500);
  }
});

export default router;
