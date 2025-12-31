import { Hono } from 'hono';
import type { Env } from '../types';
import { generateEmbedding, vectorSearch, semanticSearchLegacy, extractKeywords } from '../utils/embeddings';
import { createAuthMiddleware } from '../utils/auth-middleware';

const search = new Hono<{ Bindings: Env }>();
const authMiddleware = createAuthMiddleware();

/**
 * POST /api/search/semantic
 * Search saved content using semantic similarity
 * Uses Vectorize for fast vector search, falls back to D1 if needed
 */
search.post('/semantic', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { query, table = 'posts', limit = 10, minSimilarity = 0.7, useLegacy = false } = await c.req.json();

    if (!query || query.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Query is required'
      }, 400);
    }

    // Generate embedding for query using Workers AI
    const queryEmbedding = await generateEmbedding(c.env, query);
    if (!queryEmbedding) {
      return c.json({
        success: false,
        error: 'Failed to generate query embedding'
      }, 500);
    }

    // Use Vectorize for search if available, otherwise fall back to D1
    if (c.env.VECTORIZE && !useLegacy) {
      // Search using Vectorize
      const vectorResults = await vectorSearch(c.env, queryEmbedding, userId, {
        topK: limit,
        minScore: minSimilarity,
        table: table as 'posts' | 'memory'
      });

      // Fetch full records from D1 for matching IDs
      if (vectorResults.length > 0) {
        const ids = vectorResults.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');

        const sql = table === 'posts'
          ? `SELECT id, type, original_text, generated_output, search_keywords, created_at, context_json
             FROM posts WHERE id IN (${placeholders})`
          : `SELECT id, text, context_json, search_keywords, created_at, tags
             FROM memory WHERE id IN (${placeholders})`;

        const dbResults = await c.env.DB.prepare(sql).bind(...ids).all();

        // Merge with similarity scores
        const resultsMap = new Map((dbResults.results || []).map((r: any) => [r.id, r]));
        const results = vectorResults.map(vr => ({
          ...resultsMap.get(vr.id),
          similarity: vr.score
        })).filter(r => r.id);

        return c.json({
          success: true,
          query,
          searchMethod: 'vectorize',
          results,
          count: results.length
        });
      }

      return c.json({
        success: true,
        query,
        searchMethod: 'vectorize',
        results: [],
        count: 0
      });
    }

    // Legacy: Search using D1 with manual cosine similarity
    const results = await semanticSearchLegacy(
      c.env,
      queryEmbedding,
      table as 'posts' | 'memory',
      userId,
      limit,
      minSimilarity
    );

    return c.json({
      success: true,
      query,
      searchMethod: 'legacy',
      results: results.map(r => ({
        ...r,
        embedding_vector: undefined // Don't return full embedding
      })),
      count: results.length
    });

  } catch (error: any) {
    console.error('Semantic search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to search'
    }, 500);
  }
});

/**
 * POST /api/search/keyword
 * Search using keywords (fallback for no embeddings)
 */
search.post('/keyword', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { query, table = 'posts', limit = 10 } = await c.req.json();

    if (!query || query.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Query is required'
      }, 400);
    }

    // Extract keywords from query
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
      return c.json({
        success: true,
        query,
        results: [],
        count: 0
      });
    }

    // Build LIKE conditions for each keyword
    const likeConditions = keywords.map(() =>
      table === 'posts'
        ? '(original_text LIKE ? OR generated_output LIKE ?)'
        : 'text LIKE ?'
    ).join(' OR ');

    const likeParams = keywords.flatMap(kw => {
      const pattern = `%${kw}%`;
      return table === 'posts' ? [pattern, pattern] : [pattern];
    });

    const sql = table === 'posts'
      ? `SELECT id, type, original_text, generated_output, search_keywords, created_at
         FROM posts
         WHERE user_id = ? AND (${likeConditions})
         ORDER BY created_at DESC
         LIMIT ?`
      : `SELECT id, text, context_json, search_keywords, tags, created_at
         FROM memory
         WHERE user_id = ? AND (${likeConditions})
         ORDER BY created_at DESC
         LIMIT ?`;

    const stmt = c.env.DB.prepare(sql).bind(userId, ...likeParams, limit);
    const results = await stmt.all();

    return c.json({
      success: true,
      query,
      keywords,
      results: results.results || [],
      count: results.results?.length || 0
    });

  } catch (error: any) {
    console.error('Keyword search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to search'
    }, 500);
  }
});

/**
 * GET /api/search/recent
 * Get recent posts or memories (public endpoint for dashboard)
 * Supports text search via `q` query parameter
 */
search.get('/recent', async (c) => {
  try {
    // Try to get userId from auth header if present, otherwise get all
    let userId: string | null = null;
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      if (payload) {
        userId = payload.userId;
      }
    }

    const table = c.req.query('table') || 'posts';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const type = c.req.query('type'); // Optional filter for posts type
    const event = c.req.query('event'); // Optional filter for webhook event type
    const hasGenerated = c.req.query('hasGenerated') === 'true'; // Filter for AI content
    const searchQuery = c.req.query('q')?.trim(); // Text search query
    const tagFilter = c.req.query('tag')?.trim(); // Filter by tag (link, video, tweet)

    // Date range filters (ISO date strings or timestamps)
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // Convert date strings to timestamps
    let startTimestamp: number | null = null;
    let endTimestamp: number | null = null;

    if (startDate) {
      const parsed = Date.parse(startDate);
      if (!isNaN(parsed)) startTimestamp = parsed;
    }
    if (endDate) {
      const parsed = Date.parse(endDate);
      if (!isNaN(parsed)) endTimestamp = parsed + 86400000; // Include full end day
    }

    let sql: string;
    let bindings: any[];

    if (table === 'webhook_events') {
      // Webhook events table
      const conditions: string[] = [];
      bindings = [];

      if (event) {
        conditions.push('event = ?');
        bindings.push(event);
      }
      if (searchQuery) {
        conditions.push('(event LIKE ? OR data_json LIKE ?)');
        bindings.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }
      if (startTimestamp) {
        conditions.push('created_at >= ?');
        bindings.push(startTimestamp);
      }
      if (endTimestamp) {
        conditions.push('created_at < ?');
        bindings.push(endTimestamp);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      sql = `SELECT id, event, data_json, user_id, created_at
             FROM webhook_events ${whereClause}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      bindings.push(limit, offset);
    } else if (table === 'posts') {
      // Build WHERE conditions
      const conditions: string[] = [];
      bindings = [];

      if (userId) {
        conditions.push('user_id = ?');
        bindings.push(userId);
      }
      if (type) {
        conditions.push('type = ?');
        bindings.push(type);
      }
      if (hasGenerated) {
        conditions.push("generated_output IS NOT NULL AND generated_output != ''");
      }
      if (searchQuery) {
        conditions.push('(original_text LIKE ? OR generated_output LIKE ? OR context_json LIKE ?)');
        bindings.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
      }
      if (startTimestamp) {
        conditions.push('created_at >= ?');
        bindings.push(startTimestamp);
      }
      if (endTimestamp) {
        conditions.push('created_at < ?');
        bindings.push(endTimestamp);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      sql = `SELECT id, type, original_text, generated_output, created_at, context_json
             FROM posts ${whereClause}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      bindings.push(limit, offset);
    } else {
      // Memory table
      const conditions: string[] = [];
      bindings = [];

      if (userId) {
        conditions.push('user_id = ?');
        bindings.push(userId);
      }
      if (searchQuery) {
        conditions.push('(text LIKE ? OR context_json LIKE ? OR tags LIKE ?)');
        bindings.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
      }
      if (tagFilter) {
        // Filter by tag or by detecting URL-only for 'link' type
        if (tagFilter === 'link') {
          conditions.push("(tag = 'link' OR (text LIKE 'http%' AND LENGTH(text) < 500))");
        } else if (tagFilter === 'video') {
          conditions.push("(tag = 'video' OR context_json LIKE '%videoId%')");
        } else if (tagFilter === 'tweet') {
          conditions.push("(tag = 'tweet' OR context_json LIKE '%tweetId%')");
        } else {
          conditions.push('tag = ?');
          bindings.push(tagFilter);
        }
      }
      if (startTimestamp) {
        conditions.push('created_at >= ?');
        bindings.push(startTimestamp);
      }
      if (endTimestamp) {
        conditions.push('created_at < ?');
        bindings.push(endTimestamp);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      sql = `SELECT id, text, context_json, tags, tag, created_at
             FROM memory ${whereClause}
             ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      bindings.push(limit, offset);
    }

    const stmt = c.env.DB.prepare(sql).bind(...bindings);
    const results = await stmt.all();

    return c.json({
      success: true,
      table,
      query: searchQuery || null,
      results: results.results || [],
      count: results.results?.length || 0
    });

  } catch (error: any) {
    console.error('Recent search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get recent items'
    }, 500);
  }
});

/**
 * DELETE /api/search/memory/:id
 * Delete a memory item (for dashboard)
 */
search.delete('/memory/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM memory WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    return c.json({ success: true, message: 'Memory deleted' });
  } catch (error: any) {
    console.error('Delete memory error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/search/post/:id
 * Delete a post (tweet, video, etc.) (for dashboard)
 */
search.delete('/post/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM posts WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }

    return c.json({ success: true, message: 'Post deleted' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/search/webhook/:id
 * Delete a webhook event (for dashboard)
 */
search.delete('/webhook/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM webhook_events WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Webhook event not found' }, 404);
    }

    return c.json({ success: true, message: 'Webhook event deleted' });
  } catch (error: any) {
    console.error('Delete webhook error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PATCH /api/search/post/:id/transcript
 * Save fetched transcript to post's context_json
 */
search.patch('/post/:id/transcript', async (c) => {
  try {
    const id = c.req.param('id');
    const { transcript } = await c.req.json();

    if (!transcript) {
      return c.json({ success: false, error: 'Transcript data required' }, 400);
    }

    // Get current post
    const post = await c.env.DB
      .prepare('SELECT context_json FROM posts WHERE id = ?')
      .bind(id)
      .first<{ context_json: string }>();

    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }

    // Parse existing context and merge with transcript
    let context: any = {};
    try {
      context = post.context_json ? JSON.parse(post.context_json) : {};
    } catch {
      context = {};
    }

    context.transcript = transcript;

    // Update the post
    await c.env.DB
      .prepare('UPDATE posts SET context_json = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(context), Date.now(), id)
      .run();

    console.log('[Search] Saved transcript to post:', id);

    return c.json({
      success: true,
      message: 'Transcript saved',
      wordCount: transcript.wordCount || 0
    });
  } catch (error: any) {
    console.error('Save transcript error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default search;
