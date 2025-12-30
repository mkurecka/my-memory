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
 * POST /api/admin/sync-vectorize
 * Re-sync existing embeddings from D1 to Vectorize
 * Use this when D1 has embeddings but Vectorize is empty
 */
router.post('/sync-vectorize', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const { batchSize = 50 } = await c.req.json().catch(() => ({}));

    if (!c.env.VECTORIZE) {
      return c.json({ success: false, error: 'Vectorize not available' }, 500);
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Sync posts with existing embeddings
    const posts = await c.env.DB.prepare(`
      SELECT id, user_id, type, embedding_vector
      FROM posts
      WHERE embedding_vector IS NOT NULL AND embedding_model = ?
      LIMIT ?
    `).bind(EMBEDDING_MODEL, batchSize).all();

    for (const post of (posts.results || []) as any[]) {
      try {
        const embedding = JSON.parse(post.embedding_vector);
        await insertVector(c.env, post.id, embedding, {
          user_id: post.user_id || 'default_user',
          table: 'posts',
          type: post.type || 'unknown'
        });
        synced++;
      } catch (err: any) {
        errors++;
        errorDetails.push(`Post ${post.id}: ${err.message}`);
      }
    }

    // Sync memories with existing embeddings
    const memories = await c.env.DB.prepare(`
      SELECT id, user_id, embedding_vector
      FROM memory
      WHERE embedding_vector IS NOT NULL AND embedding_model = ?
      LIMIT ?
    `).bind(EMBEDDING_MODEL, batchSize).all();

    for (const memory of (memories.results || []) as any[]) {
      try {
        const embedding = JSON.parse(memory.embedding_vector);
        await insertVector(c.env, memory.id, embedding, {
          user_id: memory.user_id || 'default_user',
          table: 'memory',
          type: 'memory'
        });
        synced++;
      } catch (err: any) {
        errors++;
        errorDetails.push(`Memory ${memory.id}: ${err.message}`);
      }
    }

    return c.json({
      success: true,
      synced,
      errors,
      errorDetails: errorDetails.slice(0, 10),
      postsCount: posts.results?.length || 0,
      memoryCount: memories.results?.length || 0
    });
  } catch (error: any) {
    console.error('[Admin] Sync vectorize error:', error);
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

/**
 * POST /api/admin/test-vectorize
 * Test vectorize query directly
 */
router.post('/test-vectorize', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const { query = 'test' } = await c.req.json().catch(() => ({}));

    if (!c.env.VECTORIZE || !c.env.AI) {
      return c.json({ success: false, error: 'VECTORIZE or AI not available' }, 500);
    }

    // Generate embedding for query
    const embeddingResult = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [query]
    }) as { shape: number[]; data: number[][] };

    if (!embeddingResult?.data?.[0]) {
      return c.json({ success: false, error: 'Failed to generate embedding' }, 500);
    }

    const queryEmbedding = embeddingResult.data[0];
    console.log('[TestVectorize] Query embedding generated, dimensions:', queryEmbedding.length);

    // Test 1: Query without any filter
    const noFilterResults = await c.env.VECTORIZE.query(queryEmbedding, {
      topK: 5,
      returnMetadata: 'all'
    });
    console.log('[TestVectorize] No filter results:', noFilterResults.matches.length);

    // Test 2: Query with just table filter
    const tableFilterResults = await c.env.VECTORIZE.query(queryEmbedding, {
      topK: 5,
      filter: { table: 'posts' },
      returnMetadata: 'all'
    });
    console.log('[TestVectorize] Table filter results:', tableFilterResults.matches.length);

    return c.json({
      success: true,
      queryText: query,
      embeddingDimensions: queryEmbedding.length,
      noFilter: {
        count: noFilterResults.matches.length,
        matches: noFilterResults.matches.map(m => ({
          id: m.id,
          score: m.score,
          metadata: m.metadata
        }))
      },
      tableFilter: {
        count: tableFilterResults.matches.length,
        matches: tableFilterResults.matches.map(m => ({
          id: m.id,
          score: m.score,
          metadata: m.metadata
        }))
      }
    });
  } catch (error: any) {
    console.error('[TestVectorize] Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
