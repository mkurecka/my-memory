import { Hono } from 'hono';
import type { Env, Memory } from '../types';
import { verifyJWT } from '../utils/jwt';
import { generateId } from '../utils/id';
import { deleteVector, generateEmbedding, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';
import { detectUrlType, extractYouTubeVideoId } from '../utils/url';

const memory = new Hono<{ Bindings: Env }>();

// Authentication middleware
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ success: false, error: 'No authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', payload.userId);
  await next();
}

/**
 * Generate a simple hash for deduplication
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// POST /api/memory - Create memory (auto-enriches URLs)
memory.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { text, context, tag, priority = 'medium', skipDuplicateCheck = false } = await c.req.json();

    if (!text) {
      return c.json({
        success: false,
        error: 'Text is required',
      }, 400);
    }

    // Check for duplicates (by exact text match for URLs, or hash for longer content)
    if (!skipDuplicateCheck) {
      const trimmedText = text.trim();
      const isUrl = /^https?:\/\/[^\s]+$/.test(trimmedText);

      if (isUrl) {
        // For URLs, check exact match
        const existing = await c.env.DB.prepare(
          'SELECT id FROM memory WHERE user_id = ? AND text = ? LIMIT 1'
        ).bind(userId, trimmedText).first();

        if (existing) {
          console.log('[Memory] Duplicate URL detected:', trimmedText);
          return c.json({
            success: false,
            error: 'This URL is already saved',
            existingId: existing.id,
            duplicate: true
          }, 409);
        }
      } else if (text.length > 50) {
        // For longer text, check by hash (stored in context_json)
        const textHash = simpleHash(text);
        const existing = await c.env.DB.prepare(
          "SELECT id FROM memory WHERE user_id = ? AND context_json LIKE ? LIMIT 1"
        ).bind(userId, `%"textHash":"${textHash}"%`).first();

        if (existing) {
          console.log('[Memory] Duplicate content detected (hash match)');
          return c.json({
            success: false,
            error: 'Similar content already saved',
            existingId: existing.id,
            duplicate: true
          }, 409);
        }

        // Add hash to context for future deduplication
        context.textHash = textHash;
      }
    }

    const memoryId = generateId();
    const now = Date.now();

    // Check if text is a URL-only string - auto-enrich if so
    const trimmedText = text.trim();
    const urlPattern = /^https?:\/\/[^\s]+$/;
    const isUrl = urlPattern.test(trimmedText);

    let finalText = text;
    let finalContext = context || {};
    let finalTag = tag;
    let urlType: 'youtube' | 'twitter' | 'webpage' | null = null;

    if (isUrl) {
      const url = trimmedText;
      urlType = detectUrlType(url);
      console.log('[Memory] Auto-enriching URL:', url, 'type:', urlType);

      let extractedContent: {
        title?: string;
        description?: string;
        text: string;
        transcript?: string;
        author?: string;
        thumbnailUrl?: string;
        duration?: string;
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

      if (extractedContent && extractedContent.text !== url) {
        // Build combined text for embedding
        finalText = [
          extractedContent.title,
          extractedContent.description,
          extractedContent.transcript || extractedContent.text
        ].filter(Boolean).join(' ').substring(0, 10000);

        // Merge context with extracted data
        finalContext = {
          ...finalContext,
          url,
          type: urlType,
          title: extractedContent.title,
          description: extractedContent.description,
          author: extractedContent.author,
          thumbnailUrl: extractedContent.thumbnailUrl,
          duration: extractedContent.duration,
          hasTranscript: !!extractedContent.transcript,
          ...extractedContent.metadata
        };

        // Use URL type as default tag if not provided
        if (!finalTag) {
          finalTag = urlType;
        }

        console.log('[Memory] URL enriched - title:', extractedContent.title?.substring(0, 50));
      } else {
        // Extraction failed, save URL as-is with type info
        finalContext = { ...finalContext, url, type: urlType };
        if (!finalTag) finalTag = urlType;
        console.log('[Memory] URL extraction failed, saving as-is');
      }
    }

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    if (c.env.AI) {
      embedding = await generateEmbedding(c.env, finalText);
    }

    await c.env.DB
      .prepare(`
        INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, embedding_model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        memoryId,
        userId,
        finalText,
        Object.keys(finalContext).length > 0 ? JSON.stringify(finalContext) : null,
        finalTag || null,
        priority,
        embedding ? JSON.stringify(embedding) : null,
        embedding ? EMBEDDING_MODEL : null,
        now
      )
      .run();

    // Insert into Vectorize for semantic search
    if (embedding && c.env.VECTORIZE) {
      await insertVector(c.env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: urlType || 'memory'
      });
      console.log('[Memory] Created with embedding:', memoryId);
    }

    return c.json({
      success: true,
      memoryId,
      message: isUrl ? `${urlType} content saved successfully` : 'Memory saved successfully',
      ...(isUrl && { type: urlType, enriched: finalText !== text })
    }, 201);
  } catch (error: any) {
    console.error('Create memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to create memory',
    }, 500);
  }
});

// GET /api/memory - List memories
memory.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { tag, priority, limit = '50', offset = '0' } = c.req.query();

    let query = 'SELECT * FROM memory WHERE user_id = ?';
    const bindings: any[] = [userId];

    if (tag) {
      query += ' AND tag = ?';
      bindings.push(tag);
    }

    if (priority) {
      query += ' AND priority = ?';
      bindings.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(parseInt(limit), parseInt(offset));

    const result = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all<Memory>();

    return c.json({
      success: true,
      memories: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('List memories error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to list memories',
    }, 500);
  }
});

// GET /api/memory/:id - Get single memory
memory.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    const memoryItem = await c.env.DB
      .prepare('SELECT * FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .first<Memory>();

    if (!memoryItem) {
      return c.json({
        success: false,
        error: 'Memory not found',
      }, 404);
    }

    return c.json({
      success: true,
      memory: memoryItem,
    });
  } catch (error: any) {
    console.error('Get memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get memory',
    }, 500);
  }
});

// PATCH /api/memory/:id - Update memory
memory.patch('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');
    const { text, tag, priority } = await c.req.json();

    // Verify memory belongs to user
    const existing = await c.env.DB
      .prepare('SELECT id FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'Memory not found',
      }, 404);
    }

    const updates: string[] = [];
    const bindings: any[] = [];

    if (text) {
      updates.push('text = ?');
      bindings.push(text);
    }

    if (tag !== undefined) {
      updates.push('tag = ?');
      bindings.push(tag);
    }

    if (priority) {
      updates.push('priority = ?');
      bindings.push(priority);
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: 'No fields to update',
      }, 400);
    }

    bindings.push(memoryId, userId);

    await c.env.DB
      .prepare(`UPDATE memory SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...bindings)
      .run();

    // If text was updated, regenerate embedding and update Vectorize
    if (text && c.env.VECTORIZE) {
      const embedding = await generateEmbedding(c.env, text);
      if (embedding) {
        // Update D1 with new embedding
        await c.env.DB.prepare(
          'UPDATE memory SET embedding_vector = ?, embedding_model = ? WHERE id = ?'
        ).bind(JSON.stringify(embedding), EMBEDDING_MODEL, memoryId).run();

        // Update Vectorize (upsert replaces existing vector)
        await insertVector(c.env, memoryId, embedding, {
          user_id: userId,
          table: 'memory',
          type: 'memory'
        });
        console.log('[Memory] Updated embedding for:', memoryId);
      } else {
        console.warn('[Memory] Failed to regenerate embedding for:', memoryId);
      }
    }

    return c.json({
      success: true,
      message: 'Memory updated successfully',
    });
  } catch (error: any) {
    console.error('Update memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update memory',
    }, 500);
  }
});

// DELETE /api/memory/:id - Delete memory
memory.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: 'Memory not found',
      }, 404);
    }

    // Also remove from Vectorize index
    if (c.env.VECTORIZE) {
      const vectorDeleted = await deleteVector(c.env, memoryId);
      if (!vectorDeleted) {
        console.warn('[Memory] Failed to delete vector for:', memoryId);
        // Don't fail the request - D1 deletion was successful
      }
    }

    return c.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to delete memory',
    }, 500);
  }
});

// URL helpers (detectUrlType, extractYouTubeVideoId) imported from ../utils/url

/**
 * Extract content from YouTube video
 */
async function extractYouTubeContent(env: any, url: string): Promise<{
  title?: string;
  description?: string;
  text: string;
  transcript?: string;
  author?: string;
  thumbnailUrl?: string;
  duration?: string;
  metadata?: Record<string, any>;
} | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    // Use our transcript service to get video info + transcript
    const transcriptService = env.TRANSCRIPT_SERVICE;
    if (!transcriptService) {
      console.warn('[Memory] TRANSCRIPT_SERVICE not available');
      return { text: url, metadata: { videoId } };
    }

    // Fetch transcript
    const transcriptResponse = await transcriptService.fetch(
      `https://youtube-transcript-worker/transcript/${videoId}?lang=en`
    );

    let transcript = '';
    if (transcriptResponse.ok) {
      const data = await transcriptResponse.json() as any;
      if (data.success && data.text) {
        transcript = data.text;
      }
    }

    // Fetch video metadata via YouTube oEmbed (no API key needed)
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
    } catch (e) {
      console.warn('[Memory] oEmbed fetch failed:', e);
    }

    return {
      title,
      author,
      thumbnailUrl,
      text: title || url,
      transcript,
      metadata: {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`
      }
    };

  } catch (error) {
    console.error('[Memory] YouTube extraction error:', error);
    return { text: url, metadata: { videoId } };
  }
}

/**
 * Extract content from Twitter/X URL
 * Note: Limited without API access, just stores URL and oEmbed info
 */
async function extractTwitterContent(url: string): Promise<{
  title?: string;
  description?: string;
  text: string;
  author?: string;
  metadata?: Record<string, any>;
} | null> {
  try {
    // Try Twitter oEmbed
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);

    if (response.ok) {
      const oembed = await response.json() as any;
      // Extract text from HTML (basic extraction)
      const htmlText = oembed.html || '';
      const textMatch = htmlText.match(/<p[^>]*>(.*?)<\/p>/i);
      const tweetText = textMatch ? textMatch[1].replace(/<[^>]*>/g, '') : '';

      return {
        text: tweetText || url,
        author: oembed.author_name,
        metadata: {
          authorUrl: oembed.author_url,
          url
        }
      };
    }
  } catch (e) {
    console.warn('[Memory] Twitter oEmbed failed:', e);
  }

  // Fallback: just return URL
  return { text: url, metadata: { url } };
}

// POST /api/memory/:id/enrich - Re-process existing memory to extract URL content
memory.post('/:id/enrich', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    // Fetch the existing memory
    const existing = await c.env.DB
      .prepare('SELECT id, text, context_json FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .first<{ id: string; text: string; context_json: string | null }>();

    if (!existing) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    // Check if text looks like a URL
    const text = existing.text.trim();
    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (!urlPattern.test(text)) {
      return c.json({
        success: false,
        error: 'Memory text is not a URL. Only URL-only memories can be enriched.'
      }, 400);
    }

    const url = text;
    const urlType = detectUrlType(url);
    console.log('[Memory] Enriching:', memoryId, 'URL:', url, 'type:', urlType);

    let extractedContent: {
      title?: string;
      description?: string;
      text: string;
      transcript?: string;
      author?: string;
      thumbnailUrl?: string;
      duration?: string;
      metadata?: Record<string, any>;
    } | null = null;

    // Extract content based on URL type
    if (urlType === 'youtube') {
      extractedContent = await extractYouTubeContent(c.env, url);
    } else if (urlType === 'twitter') {
      extractedContent = await extractTwitterContent(url);
    } else {
      // Generic webpage - try to fetch and extract
      extractedContent = await extractWebpageContent(url);
    }

    if (!extractedContent || extractedContent.text === url) {
      return c.json({
        success: false,
        error: 'Could not extract content from URL'
      }, 400);
    }

    // Build combined text for embedding
    const combinedText = [
      extractedContent.title,
      extractedContent.description,
      extractedContent.transcript || extractedContent.text
    ].filter(Boolean).join(' ');

    // Generate new embedding
    let embedding: number[] | null = null;
    if (c.env.AI && combinedText) {
      embedding = await generateEmbedding(c.env, combinedText);
    }

    // Merge with existing context
    let existingContext: Record<string, any> = {};
    try {
      existingContext = existing.context_json ? JSON.parse(existing.context_json) : {};
    } catch { /* ignore */ }

    const newContext = {
      ...existingContext,
      url,
      type: urlType,
      title: extractedContent.title,
      description: extractedContent.description,
      author: extractedContent.author,
      thumbnailUrl: extractedContent.thumbnailUrl,
      duration: extractedContent.duration,
      hasTranscript: !!extractedContent.transcript,
      enrichedAt: new Date().toISOString(),
      ...extractedContent.metadata
    };

    // Update D1
    await c.env.DB
      .prepare(`
        UPDATE memory
        SET text = ?, context_json = ?, tag = COALESCE(tag, ?),
            embedding_vector = ?, embedding_model = ?
        WHERE id = ?
      `)
      .bind(
        combinedText.substring(0, 10000),
        JSON.stringify(newContext),
        urlType,
        embedding ? JSON.stringify(embedding) : null,
        embedding ? EMBEDDING_MODEL : null,
        memoryId
      )
      .run();

    // Update Vectorize
    if (embedding && c.env.VECTORIZE) {
      await insertVector(c.env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: urlType
      });
    }

    console.log('[Memory] Enriched:', memoryId, 'type:', urlType, embedding ? '(with embedding)' : '');

    return c.json({
      success: true,
      memoryId,
      type: urlType,
      title: extractedContent.title,
      hasTranscript: !!extractedContent.transcript,
      textLength: combinedText.length,
      message: `Memory enriched with ${urlType} content`
    });

  } catch (error: any) {
    console.error('[Memory] enrich error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to enrich memory'
    }, 500);
  }
});

/**
 * Extract content from generic webpage using fetch
 */
async function extractWebpageContent(url: string): Promise<{
  title?: string;
  description?: string;
  text: string;
  author?: string;
  metadata?: Record<string, any>;
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyMemoryBot/1.0)'
      }
    });

    if (!response.ok) {
      console.warn('[Memory] Webpage fetch failed:', response.status);
      return null;
    }

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

    // Extract article/main content (basic extraction)
    let mainText = '';

    // Try to find article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      mainText = articleMatch[1];
    } else {
      // Try main tag
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) {
        mainText = mainMatch[1];
      }
    }

    // Strip HTML tags and clean up
    const cleanText = mainText
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000); // Limit for embedding

    const finalTitle = ogTitleMatch?.[1] || title;
    const finalDesc = ogDescMatch?.[1] || description;

    return {
      title: finalTitle,
      description: finalDesc,
      text: cleanText || finalDesc || finalTitle || url,
      metadata: {
        url,
        ogImage: ogImageMatch?.[1]
      }
    };

  } catch (error) {
    console.error('[Memory] Webpage extraction error:', error);
    return null;
  }
}

// GET /api/memory/tags/list - List all unique tags
memory.get('/tags/list', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const result = await c.env.DB
      .prepare('SELECT DISTINCT tag FROM memory WHERE user_id = ? AND tag IS NOT NULL ORDER BY tag')
      .bind(userId)
      .all<{ tag: string }>();

    return c.json({
      success: true,
      tags: result.results?.map(r => r.tag) || [],
    });
  } catch (error: any) {
    console.error('List tags error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to list tags',
    }, 500);
  }
});

export default memory;
