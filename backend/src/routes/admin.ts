import { Hono } from 'hono';
import type { Env } from '../types';
import { generateEmbedding, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';

const router = new Hono<{ Bindings: Env }>();

// Simple admin key check (use env variable in production)
const ADMIN_KEY = 'migrate-vectors-2025';

function checkAdminAuth(c: any): boolean {
  const authHeader = c.req.header('X-Admin-Key');
  return authHeader === ADMIN_KEY;
}

/**
 * GET /api/admin/migration-status
 * Check current migration status
 */
router.get('/migration-status', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    // Count records in each table with detailed breakdown
    const postsCount = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN embedding_model = ? THEN 1 ELSE 0 END) as migrated,
        SUM(CASE WHEN (original_text IS NULL OR original_text = '') THEN 1 ELSE 0 END) as no_text,
        SUM(CASE WHEN (embedding_model IS NULL OR embedding_model != ?)
                  AND original_text IS NOT NULL AND original_text != '' THEN 1 ELSE 0 END) as pending
      FROM posts
    `).bind(EMBEDDING_MODEL, EMBEDDING_MODEL).first<{ total: number; migrated: number; no_text: number; pending: number }>();

    const memoryCount = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN embedding_model = ? THEN 1 ELSE 0 END) as migrated,
        SUM(CASE WHEN (text IS NULL OR text = '') THEN 1 ELSE 0 END) as no_text,
        SUM(CASE WHEN (embedding_model IS NULL OR embedding_model != ?)
                  AND text IS NOT NULL AND text != '' THEN 1 ELSE 0 END) as pending
      FROM memory
    `).bind(EMBEDDING_MODEL, EMBEDDING_MODEL).first<{ total: number; migrated: number; no_text: number; pending: number }>();

    return c.json({
      success: true,
      posts: {
        total: postsCount?.total || 0,
        migrated: postsCount?.migrated || 0,
        no_text: postsCount?.no_text || 0,
        pending: postsCount?.pending || 0
      },
      memory: {
        total: memoryCount?.total || 0,
        migrated: memoryCount?.migrated || 0,
        no_text: memoryCount?.no_text || 0,
        pending: memoryCount?.pending || 0
      },
      targetModel: EMBEDDING_MODEL
    });
  } catch (error: any) {
    console.error('[Admin] Migration status error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/admin/migrate-posts
 * Migrate posts embeddings to Workers AI + Vectorize
 */
router.post('/migrate-posts', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const { batchSize = 10, offset = 0 } = await c.req.json().catch(() => ({}));

    // Fetch posts that need migration (not using the new model)
    const posts = await c.env.DB.prepare(`
      SELECT id, user_id, type, original_text, generated_output
      FROM posts
      WHERE (embedding_model IS NULL OR embedding_model != ?)
        AND original_text IS NOT NULL
        AND original_text != ''
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(EMBEDDING_MODEL, batchSize, offset).all();

    if (!posts.results || posts.results.length === 0) {
      return c.json({
        success: true,
        message: 'No more posts to migrate',
        migrated: 0,
        offset,
        hasMore: false
      });
    }

    let migrated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const post of posts.results as any[]) {
      try {
        // Combine text for embedding
        const text = post.generated_output
          ? `${post.original_text} ${post.generated_output}`
          : post.original_text;

        // Generate new embedding with Workers AI
        const embedding = await generateEmbedding(c.env, text);

        if (!embedding) {
          errors++;
          errorDetails.push(`Post ${post.id}: Failed to generate embedding`);
          continue;
        }

        // Update D1 with new embedding
        await c.env.DB.prepare(`
          UPDATE posts SET embedding_vector = ?, embedding_model = ? WHERE id = ?
        `).bind(JSON.stringify(embedding), EMBEDDING_MODEL, post.id).run();

        // Insert into Vectorize
        if (c.env.VECTORIZE) {
          await insertVector(c.env, post.id, embedding, {
            user_id: post.user_id,
            table: 'posts',
            type: post.type || 'unknown'
          });
        }

        migrated++;
      } catch (err: any) {
        errors++;
        errorDetails.push(`Post ${post.id}: ${err.message}`);
      }
    }

    return c.json({
      success: true,
      migrated,
      errors,
      errorDetails: errorDetails.slice(0, 5),
      offset,
      nextOffset: offset + batchSize,
      hasMore: posts.results.length === batchSize
    });
  } catch (error: any) {
    console.error('[Admin] Migrate posts error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/admin/migrate-memory
 * Migrate memory embeddings to Workers AI + Vectorize
 */
router.post('/migrate-memory', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const { batchSize = 10, offset = 0 } = await c.req.json().catch(() => ({}));

    // Fetch memories that need migration
    const memories = await c.env.DB.prepare(`
      SELECT id, user_id, text
      FROM memory
      WHERE (embedding_model IS NULL OR embedding_model != ?)
        AND text IS NOT NULL
        AND text != ''
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(EMBEDDING_MODEL, batchSize, offset).all();

    if (!memories.results || memories.results.length === 0) {
      return c.json({
        success: true,
        message: 'No more memories to migrate',
        migrated: 0,
        offset,
        hasMore: false
      });
    }

    let migrated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const memory of memories.results as any[]) {
      try {
        // Generate new embedding with Workers AI
        const embedding = await generateEmbedding(c.env, memory.text);

        if (!embedding) {
          errors++;
          errorDetails.push(`Memory ${memory.id}: Failed to generate embedding`);
          continue;
        }

        // Update D1 with new embedding
        await c.env.DB.prepare(`
          UPDATE memory SET embedding_vector = ?, embedding_model = ? WHERE id = ?
        `).bind(JSON.stringify(embedding), EMBEDDING_MODEL, memory.id).run();

        // Insert into Vectorize
        if (c.env.VECTORIZE) {
          await insertVector(c.env, memory.id, embedding, {
            user_id: memory.user_id,
            table: 'memory',
            type: 'memory'
          });
        }

        migrated++;
      } catch (err: any) {
        errors++;
        errorDetails.push(`Memory ${memory.id}: ${err.message}`);
      }
    }

    return c.json({
      success: true,
      migrated,
      errors,
      errorDetails: errorDetails.slice(0, 5),
      offset,
      nextOffset: offset + batchSize,
      hasMore: memories.results.length === batchSize
    });
  } catch (error: any) {
    console.error('[Admin] Migrate memory error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/admin/migrate-all
 * Run full migration (for small datasets)
 */
router.post('/migrate-all', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const results = {
      posts: { migrated: 0, errors: 0 },
      memory: { migrated: 0, errors: 0 }
    };

    // Migrate all posts
    let hasMorePosts = true;
    let postsOffset = 0;
    while (hasMorePosts) {
      const postsRes = await fetch(c.req.url.replace('/migrate-all', '/migrate-posts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({ batchSize: 20, offset: postsOffset })
      });
      const data = await postsRes.json() as any;
      results.posts.migrated += data.migrated || 0;
      results.posts.errors += data.errors || 0;
      hasMorePosts = data.hasMore;
      postsOffset = data.nextOffset || postsOffset + 20;
    }

    // Migrate all memories
    let hasMoreMemory = true;
    let memoryOffset = 0;
    while (hasMoreMemory) {
      const memRes = await fetch(c.req.url.replace('/migrate-all', '/migrate-memory'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({ batchSize: 20, offset: memoryOffset })
      });
      const data = await memRes.json() as any;
      results.memory.migrated += data.migrated || 0;
      results.memory.errors += data.errors || 0;
      hasMoreMemory = data.hasMore;
      memoryOffset = data.nextOffset || memoryOffset + 20;
    }

    return c.json({
      success: true,
      message: 'Full migration complete',
      results
    });
  } catch (error: any) {
    console.error('[Admin] Migrate all error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
