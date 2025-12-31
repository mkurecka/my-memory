import { Hono } from 'hono';
import type { Env } from '../types';
import { generateEmbedding, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';
import { detectUrlType, extractYouTubeVideoId } from '../utils/url';

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

/**
 * POST /api/admin/label-url-memories
 * Add "link" tag to all URL-only memories
 */
router.post('/label-url-memories', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    // Update all URL-only memories to have tag = 'link'
    const result = await c.env.DB.prepare(`
      UPDATE memory
      SET tag = 'link'
      WHERE text LIKE 'http%'
        AND text NOT LIKE '% %'
        AND (tag IS NULL OR tag = '')
    `).run();

    return c.json({
      success: true,
      labeled: result.meta.changes || 0,
      message: 'URL memories labeled with "link" tag'
    });
  } catch (error: any) {
    console.error('[Admin] Label URL memories error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/admin/enrich-url-memories
 * Find all URL-only memories, fetch content, and sync to Vectorize
 */
router.post('/enrich-url-memories', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const { batchSize = 10, offset = 0, parallel = false } = await c.req.json().catch(() => ({}));

    // Find memories that look like URL-only (text starts with http and is short like a URL)
    // Re-process if content is still just the URL (length < 200 chars)
    const memories = await c.env.DB.prepare(`
      SELECT id, user_id, text, context_json
      FROM memory
      WHERE text LIKE 'http%'
        AND LENGTH(text) < 200
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(batchSize, offset).all();

    if (!memories.results || memories.results.length === 0) {
      return c.json({
        success: true,
        message: 'No more URL-only memories to enrich',
        enriched: 0,
        offset,
        hasMore: false
      });
    }

    let enriched = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const results: any[] = [];

    for (const mem of memories.results as any[]) {
      try {
        const url = mem.text.trim();
        const urlType = detectUrlType(url);
        console.log('[Admin] Enriching URL memory:', mem.id, 'type:', urlType);

        let extractedContent: {
          title?: string;
          description?: string;
          text: string;
          transcript?: string;
          author?: string;
          thumbnailUrl?: string;
          metadata?: Record<string, any>;
        } | null = null;

        // Extract content based on URL type
        if (urlType === 'youtube') {
          extractedContent = await extractYouTubeContent(c.env, url);
        } else if (urlType === 'twitter') {
          extractedContent = await extractTwitterContent(url);
        } else {
          extractedContent = await extractWebpageContent(url);
        }

        if (!extractedContent || extractedContent.text === url) {
          // Couldn't extract, but still generate embedding for the URL and set tag='link'
          const embedding = await generateEmbedding(c.env, url);
          if (embedding) {
            await c.env.DB.prepare(`
              UPDATE memory SET embedding_vector = ?, embedding_model = ?, tag = 'link' WHERE id = ?
            `).bind(JSON.stringify(embedding), EMBEDDING_MODEL, mem.id).run();

            if (c.env.VECTORIZE) {
              await insertVector(c.env, mem.id, embedding, {
                user_id: mem.user_id || 'default_user',
                table: 'memory',
                type: 'link',
                subtype: urlType
              });
            }
          }
          results.push({ id: mem.id, type: urlType, enriched: false, reason: 'extraction_failed' });
          continue;
        }

        // Build combined text
        const combinedText = [
          extractedContent.title,
          extractedContent.description,
          extractedContent.transcript || extractedContent.text
        ].filter(Boolean).join(' ').substring(0, 10000);

        // Generate embedding
        const embedding = await generateEmbedding(c.env, combinedText);

        // Merge with existing context
        let existingContext: Record<string, any> = {};
        try {
          existingContext = mem.context_json ? JSON.parse(mem.context_json) : {};
        } catch { /* ignore */ }

        const newContext = {
          ...existingContext,
          url,
          type: urlType,
          title: extractedContent.title,
          description: extractedContent.description,
          author: extractedContent.author,
          thumbnailUrl: extractedContent.thumbnailUrl,
          hasTranscript: !!extractedContent.transcript,
          enrichedAt: new Date().toISOString(),
          ...extractedContent.metadata
        };

        // Update D1 - always set tag to 'link' for URL memories
        await c.env.DB.prepare(`
          UPDATE memory
          SET text = ?, context_json = ?, tag = 'link',
              embedding_vector = ?, embedding_model = ?
          WHERE id = ?
        `).bind(
          combinedText,
          JSON.stringify(newContext),
          embedding ? JSON.stringify(embedding) : null,
          embedding ? EMBEDDING_MODEL : null,
          mem.id
        ).run();

        // Update Vectorize - use 'link' as primary type, urlType as subtype
        if (embedding && c.env.VECTORIZE) {
          await insertVector(c.env, mem.id, embedding, {
            user_id: mem.user_id || 'default_user',
            table: 'memory',
            type: 'link',
            subtype: urlType  // youtube, twitter, or webpage
          });
        }

        enriched++;
        results.push({
          id: mem.id,
          type: urlType,
          enriched: true,
          title: extractedContent.title?.substring(0, 50),
          textLength: combinedText.length
        });

      } catch (err: any) {
        errors++;
        errorDetails.push(`${mem.id}: ${err.message}`);
      }
    }

    return c.json({
      success: true,
      enriched,
      errors,
      errorDetails: errorDetails.slice(0, 5),
      results,
      offset,
      nextOffset: offset + batchSize,
      hasMore: memories.results.length === batchSize
    });

  } catch (error: any) {
    console.error('[Admin] Enrich URL memories error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/admin/url-memories-status
 * Check how many URL-only memories need enrichment
 */
router.get('/url-memories-status', async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_url_memories,
        SUM(CASE WHEN LENGTH(text) >= 200 THEN 1 ELSE 0 END) as already_enriched,
        SUM(CASE WHEN LENGTH(text) < 200 THEN 1 ELSE 0 END) as pending
      FROM memory
      WHERE tag = 'link' OR (text LIKE 'http%' AND LENGTH(text) < 200)
    `).first<{
      total_url_memories: number;
      already_enriched: number;
      pending: number;
    }>();

    // Get breakdown by URL type
    const urlBreakdown = await c.env.DB.prepare(`
      SELECT
        CASE
          WHEN LOWER(text) LIKE '%youtube.com%' OR LOWER(text) LIKE '%youtu.be%' THEN 'youtube'
          WHEN LOWER(text) LIKE '%twitter.com%' OR LOWER(text) LIKE '%x.com%' THEN 'twitter'
          ELSE 'webpage'
        END as url_type,
        COUNT(*) as count
      FROM memory
      WHERE text LIKE 'http%' AND LENGTH(text) < 200
      GROUP BY url_type
    `).all();

    return c.json({
      success: true,
      stats: stats || { total_url_memories: 0, already_enriched: 0, pending: 0 },
      pendingByType: urlBreakdown.results || [],
      targetModel: EMBEDDING_MODEL
    });

  } catch (error: any) {
    console.error('[Admin] URL memories status error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// URL helpers (detectUrlType, extractYouTubeVideoId) imported from ../utils/url

async function extractYouTubeContent(env: any, url: string): Promise<{
  title?: string;
  description?: string;
  text: string;
  transcript?: string;
  author?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
} | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    const transcriptService = env.TRANSCRIPT_SERVICE;
    let transcript = '';

    if (transcriptService) {
      const transcriptResponse = await transcriptService.fetch(
        `https://youtube-transcript-worker/transcript/${videoId}?lang=en`
      );
      if (transcriptResponse.ok) {
        const data = await transcriptResponse.json() as any;
        if (data.success && data.text) {
          transcript = data.text;
        }
      }
    }

    // Fetch metadata via oEmbed
    let title = '';
    let author = '';
    let thumbnailUrl = '';

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedResponse = await fetch(oembedUrl);
      if (oembedResponse.ok) {
        const oembed = await oembedResponse.json() as any;
        title = oembed.title || '';
        author = oembed.author_name || '';
        thumbnailUrl = oembed.thumbnail_url || '';
      }
    } catch (e) { /* ignore */ }

    return {
      title,
      author,
      thumbnailUrl,
      text: title || url,
      transcript,
      metadata: { videoId, url: `https://www.youtube.com/watch?v=${videoId}` }
    };
  } catch (error) {
    console.error('[Admin] YouTube extraction error:', error);
    return { text: url, metadata: { videoId } };
  }
}

async function extractTwitterContent(url: string): Promise<{
  title?: string;
  description?: string;
  text: string;
  author?: string;
  metadata?: Record<string, any>;
} | null> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);

    if (response.ok) {
      const oembed = await response.json() as any;
      const htmlText = oembed.html || '';
      const textMatch = htmlText.match(/<p[^>]*>(.*?)<\/p>/i);
      const tweetText = textMatch ? textMatch[1].replace(/<[^>]*>/g, '') : '';

      return {
        text: tweetText || url,
        author: oembed.author_name,
        metadata: { authorUrl: oembed.author_url, url }
      };
    }
  } catch (e) { /* ignore */ }

  return { text: url, metadata: { url } };
}

async function extractWebpageContent(url: string): Promise<{
  title?: string;
  description?: string;
  text: string;
  author?: string;
  metadata?: Record<string, any>;
} | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyMemoryBot/1.0)' }
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract Open Graph data
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    // Extract article content
    let mainText = '';
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      mainText = articleMatch[1];
    } else {
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) mainText = mainMatch[1];
    }

    // Clean HTML
    const cleanText = mainText
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);

    const finalTitle = ogTitleMatch?.[1] || title;
    const finalDesc = ogDescMatch?.[1] || description;

    return {
      title: finalTitle,
      description: finalDesc,
      text: cleanText || finalDesc || finalTitle || url,
      metadata: { url, ogImage: ogImageMatch?.[1] }
    };
  } catch (error) {
    console.error('[Admin] Webpage extraction error:', error);
    return null;
  }
}

export default router;
