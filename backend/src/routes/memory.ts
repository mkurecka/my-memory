import { Hono } from 'hono';
import type { Env, Memory } from '../types';
import { verifyJWT } from '../utils/jwt';
import { generateId } from '../utils/id';
import { deleteVector, generateEmbedding, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';

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

// POST /api/memory - Create memory
memory.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { text, context, tag, priority = 'medium' } = await c.req.json();

    if (!text) {
      return c.json({
        success: false,
        error: 'Text is required',
      }, 400);
    }

    const memoryId = generateId();
    const now = Date.now();

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    if (c.env.AI) {
      embedding = await generateEmbedding(c.env, text);
    }

    await c.env.DB
      .prepare(`
        INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, embedding_model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        memoryId,
        userId,
        text,
        context ? JSON.stringify(context) : null,
        tag || null,
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
        type: 'memory'
      });
      console.log('[Memory] Created with embedding:', memoryId);
    }

    return c.json({
      success: true,
      memoryId,
      message: 'Memory saved successfully',
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

// POST /api/memory/from-url - Create memory from URL with auto-content extraction
memory.post('/from-url', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { url, tag, priority = 'medium' } = await c.req.json();

    if (!url) {
      return c.json({ success: false, error: 'URL is required' }, 400);
    }

    // Detect URL type
    const urlType = detectUrlType(url);
    console.log('[Memory] Processing URL:', url, 'type:', urlType);

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
      // Generic webpage - just save the URL for now
      extractedContent = { text: url };
    }

    if (!extractedContent) {
      return c.json({
        success: false,
        error: 'Failed to extract content from URL'
      }, 400);
    }

    const memoryId = generateId();
    const now = Date.now();

    // Build combined text for embedding
    const combinedText = [
      extractedContent.title,
      extractedContent.description,
      extractedContent.transcript || extractedContent.text
    ].filter(Boolean).join(' ');

    // Generate embedding
    let embedding: number[] | null = null;
    if (c.env.AI && combinedText) {
      embedding = await generateEmbedding(c.env, combinedText);
    }

    // Build context with all extracted data
    const context = {
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

    // Save to D1
    await c.env.DB
      .prepare(`
        INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, embedding_model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        memoryId,
        userId,
        combinedText.substring(0, 10000), // Limit text size
        JSON.stringify(context),
        tag || urlType, // Use URL type as default tag
        priority,
        embedding ? JSON.stringify(embedding) : null,
        embedding ? EMBEDDING_MODEL : null,
        now
      )
      .run();

    // Insert into Vectorize
    if (embedding && c.env.VECTORIZE) {
      await insertVector(c.env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: urlType
      });
    }

    console.log('[Memory] Created from URL:', memoryId, 'type:', urlType, embedding ? '(with embedding)' : '');

    return c.json({
      success: true,
      memoryId,
      type: urlType,
      title: extractedContent.title,
      hasTranscript: !!extractedContent.transcript,
      message: `${urlType} content saved successfully`
    }, 201);

  } catch (error: any) {
    console.error('[Memory] from-url error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to process URL'
    }, 500);
  }
});

/**
 * Detect URL type from URL string
 */
function detectUrlType(url: string): 'youtube' | 'twitter' | 'webpage' {
  const lowerUrl = url.toLowerCase();

  // YouTube patterns
  if (lowerUrl.includes('youtube.com/watch') ||
      lowerUrl.includes('youtu.be/') ||
      lowerUrl.includes('youtube.com/shorts/')) {
    return 'youtube';
  }

  // Twitter/X patterns
  if (lowerUrl.includes('twitter.com/') ||
      lowerUrl.includes('x.com/')) {
    return 'twitter';
  }

  return 'webpage';
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

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
