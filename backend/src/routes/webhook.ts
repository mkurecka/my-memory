import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';
import { generateEmbedding, extractKeywords, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';

const router = new Hono<{ Bindings: Env }>();

/**
 * POST /api/webhook
 * Generic webhook endpoint to receive events from extension
 * Now saves actual data to posts/memory tables based on event type
 */
router.post('/', async (c) => {
  try {
    const payload = await c.req.json();
    const { event, data, userId } = payload;

    console.log('[Webhook] Received event:', event);
    console.log('[Webhook] Full payload:', JSON.stringify(payload, null, 2));
    console.log('[Webhook] UserId:', userId || 'anonymous');
    console.log('[Webhook] Data keys:', data ? Object.keys(data) : 'no data');

    // Store webhook event in webhook_events table (event log)
    try {
      const eventId = generateId('evt');
      await c.env.DB.prepare(
        'INSERT INTO webhook_events (id, event, data_json, user_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        eventId,
        event,
        JSON.stringify(data),
        userId || null,
        Date.now()
      ).run();
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
      // Continue even if DB fails
    }

    // Save actual data to appropriate tables based on event type
    let savedId: string | null = null;
    let savedType: string | null = null;

    if (userId) {
      console.log('[Webhook] UserId present, attempting to save data...');
      try {
        // Ensure user exists (create guest user if needed)
        await ensureUserExists(c, userId);
        console.log('[Webhook] User exists check passed');

        console.log('[Webhook] Checking event type:', event);
        switch (event) {
          case 'onSaveTweet':
            console.log('[Webhook] Calling saveTweetToDatabase...');
            await saveTweetToDatabase(c, userId, data);
            savedType = 'tweet';
            break;
          case 'onSaveYouTubeVideo':
            console.log('[Webhook] Calling saveYouTubeVideoToDatabase...');
            await saveYouTubeVideoToDatabase(c, userId, data);
            savedType = 'video';
            break;
          case 'saveToMemory':
          case 'onSaveToMemory':
            console.log('[Webhook] Calling saveMemoryToDatabase...');
            const memoryResult = await saveMemoryToDatabase(c, userId, data);
            savedId = memoryResult.memoryId;
            savedType = memoryResult.isDuplicate ? 'duplicate' : 'memory';
            // Trigger async URL enrichment if it's a NEW URL (not duplicate)
            if (memoryResult.isUrl && memoryResult.urlType && !memoryResult.isDuplicate) {
              console.log('[Webhook] Triggering async URL enrichment for:', savedId);
              // Use waitUntil for background processing (non-blocking)
              c.executionCtx.waitUntil(
                enrichUrlMemory(c.env, memoryResult.memoryId, memoryResult.text, memoryResult.urlType)
              );
            } else if (memoryResult.isDuplicate) {
              console.log('[Webhook] Skipping enrichment for duplicate:', savedId);
            }
            break;
          case 'processText':
          case 'onProcessText':
            console.log('[Webhook] Calling saveProcessedTextToDatabase...');
            await saveProcessedTextToDatabase(c, userId, data);
            savedType = 'processed';
            break;
          default:
            console.log('[Webhook] Unknown event type, not saving:', event);
        }
      } catch (saveError) {
        console.error('[Webhook] Error saving data:', saveError);
        console.error('[Webhook] Stack trace:', saveError instanceof Error ? saveError.stack : 'no stack');
        // Continue even if save fails
      }
    } else {
      console.log('[Webhook] No userId provided, skipping data save');
    }

    // Forward to external webhook if configured
    let forwardUrl: string | null = null;

    // Try to get webhook URL from user settings
    if (userId) {
      try {
        const userSettings = await c.env.DB.prepare(
          'SELECT settings_json FROM users WHERE id = ?'
        ).bind(userId).first();

        if (userSettings?.settings_json) {
          const settings = JSON.parse(userSettings.settings_json as string);
          if (settings?.webhook?.url && settings?.webhook?.enabled) {
            forwardUrl = settings.webhook.url;
          }
        }
      } catch (settingsError) {
        console.error('[Webhook] Error fetching user settings:', settingsError);
      }
    }

    // Fallback to environment variable
    if (!forwardUrl && c.env.N8N_WEBHOOK_URL) {
      forwardUrl = c.env.N8N_WEBHOOK_URL;
    }

    // Forward webhook if URL is configured
    if (forwardUrl) {
      try {
        console.log('[Webhook] Forwarding to:', forwardUrl);

        const forwardResponse = await fetch(forwardUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-From': 'text-processor-api',
            'X-Original-Event': event
          },
          body: JSON.stringify(payload)
        });

        console.log('[Webhook] Forward response:', {
          status: forwardResponse.status,
          ok: forwardResponse.ok
        });

        if (!forwardResponse.ok) {
          const errorText = await forwardResponse.text();
          console.error('[Webhook] Forward failed:', errorText);
        }
      } catch (forwardError) {
        console.error('[Webhook] Forward error:', forwardError);
        // Don't fail the original webhook on forward errors
      }
    }

    return c.json({
      success: true,
      message: 'Webhook received',
      event,
      forwarded: !!forwardUrl,
      memoryId: savedId,
      savedType,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process webhook'
    }, 400);
  }
});

/**
 * Simple hash function for deduplication
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * GET /api/webhook/health
 * Health check for webhook endpoint
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Webhook endpoint is healthy',
    timestamp: Date.now()
  });
});

/**
 * Ensure user exists in database (create guest user if needed)
 */
async function ensureUserExists(c: any, userId: string) {
  try {
    // Check if user exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      // Create guest user (no email/password, just for data storage)
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, created_at, subscription_tier)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        userId,
        `guest_${userId}@extension.local`, // Placeholder email
        'guest', // Placeholder password hash
        Date.now(),
        'free'
      ).run();

      console.log('[Webhook] Created guest user:', userId);
    }
  } catch (error) {
    console.error('[Webhook] Error ensuring user exists:', error);
    throw error; // Re-throw to prevent saving data without user
  }
}

/**
 * Helper function to save tweet data to posts table
 */
async function saveTweetToDatabase(c: any, userId: string, data: any) {
  console.log('[saveTweetToDatabase] Starting...');
  console.log('[saveTweetToDatabase] Input data:', JSON.stringify(data, null, 2));

  const postId = generateId('post');
  const tweetData = data.data || data;
  console.log('[saveTweetToDatabase] Extracted tweetData:', JSON.stringify(tweetData, null, 2));

  const text = tweetData.text || '';
  console.log('[saveTweetToDatabase] Extracted text:', text);

  // Generate embedding and keywords for semantic search using Workers AI
  let embedding: number[] | null = null;
  let keywords: string[] = [];

  if (c.env.AI && text) {
    console.log('[saveTweetToDatabase] Generating embedding with Workers AI...');
    embedding = await generateEmbedding(c.env, text);
    keywords = extractKeywords(text);
    console.log('[saveTweetToDatabase] Embedding generated:', !!embedding, 'Keywords:', keywords.length);
  } else {
    console.log('[saveTweetToDatabase] Skipping embedding (AI:', !!c.env.AI, 'text:', !!text, ')');
  }

  console.log('[saveTweetToDatabase] Inserting into posts table...');
  const result = await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, type, original_text, context_json, status, embedding_vector, embedding_model, search_keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId,
    userId,
    'tweet',
    text,
    JSON.stringify({
      tweetId: tweetData.tweetId,
      author: tweetData.author,
      url: tweetData.url,
      timestamp: tweetData.timestamp,
      media: tweetData.media,
      metadata: tweetData.metadata
    }),
    'completed',
    embedding ? JSON.stringify(embedding) : null,
    embedding ? EMBEDDING_MODEL : null,
    keywords.length > 0 ? JSON.stringify(keywords) : null,
    Date.now()
  ).run();

  // Insert into Vectorize for semantic search
  if (embedding && c.env.VECTORIZE) {
    await insertVector(c.env, postId, embedding, {
      user_id: userId,
      table: 'posts',
      type: 'tweet'
    });
  }

  console.log('[saveTweetToDatabase] Insert result:', JSON.stringify(result));
  console.log('[Webhook] Saved tweet to posts table:', postId, embedding ? '(with embedding + vectorize)' : '(no embedding)');
}

/**
 * Helper function to save YouTube video data to posts table
 */
async function saveYouTubeVideoToDatabase(c: any, userId: string, data: any) {
  const postId = generateId('post');
  const videoData = data.data || data;
  const title = videoData.title || '';
  const description = videoData.description || '';
  const transcript = videoData.transcript?.text || '';
  const combinedText = `${title} ${description} ${transcript}`.trim();

  // Generate embedding and keywords using Workers AI
  let embedding: number[] | null = null;
  let keywords: string[] = [];

  if (c.env.AI && combinedText) {
    embedding = await generateEmbedding(c.env, combinedText);
    keywords = extractKeywords(combinedText);
  }

  await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, type, original_text, generated_output, context_json, status, embedding_vector, embedding_model, search_keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId,
    userId,
    'youtube_video',
    title,
    transcript || null,
    JSON.stringify({
      videoId: videoData.videoId,
      url: videoData.url,
      title: videoData.title,
      channel: videoData.channel,
      description: videoData.description,
      transcript: videoData.transcript,
      metadata: videoData.metadata
    }),
    'completed',
    embedding ? JSON.stringify(embedding) : null,
    embedding ? EMBEDDING_MODEL : null,
    keywords.length > 0 ? JSON.stringify(keywords) : null,
    Date.now()
  ).run();

  // Insert into Vectorize for semantic search
  if (embedding && c.env.VECTORIZE) {
    await insertVector(c.env, postId, embedding, {
      user_id: userId,
      table: 'posts',
      type: 'youtube_video'
    });
  }

  console.log('[Webhook] Saved YouTube video to posts table:', postId, embedding ? '(with embedding + vectorize)' : '(no embedding)');
}

/**
 * Helper function to detect if text is a URL
 */
function isUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\/[^\s]+$/.test(trimmed) && trimmed.length < 500;
}

/**
 * Helper function to detect URL type
 */
function detectUrlType(url: string): 'youtube' | 'twitter' | 'webpage' {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
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
 * Enrich URL memory with extracted content (async, runs after save)
 * Uses executionCtx.waitUntil for background processing
 */
async function enrichUrlMemory(env: any, memoryId: string, url: string, urlType: string): Promise<void> {
  console.log('[Webhook] Enriching URL memory:', memoryId, urlType);

  try {
    let title = '';
    let description = '';
    let author = '';
    let thumbnailUrl = '';
    let transcript = '';
    let combinedText = url;
    const metadata: Record<string, any> = { url };

    if (urlType === 'youtube') {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        metadata.videoId = videoId;

        // Fetch transcript if service available
        if (env.TRANSCRIPT_SERVICE) {
          try {
            const transcriptResponse = await env.TRANSCRIPT_SERVICE.fetch(
              `https://youtube-transcript-worker/transcript/${videoId}?lang=en`
            );
            if (transcriptResponse.ok) {
              const data = await transcriptResponse.json() as any;
              if (data.success && data.text) {
                transcript = data.text;
              }
            }
          } catch (e) {
            console.warn('[Webhook] Transcript fetch failed:', e);
          }
        }

        // Fetch oEmbed data
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
          console.warn('[Webhook] YouTube oEmbed failed:', e);
        }

        combinedText = [title, description, transcript].filter(Boolean).join(' ').substring(0, 10000) || url;
      }
    } else if (urlType === 'twitter') {
      // Try Twitter oEmbed
      try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const oembed = await response.json() as any;
          author = oembed.author_name || '';
          const htmlText = oembed.html || '';
          const textMatch = htmlText.match(/<p[^>]*>(.*?)<\/p>/i);
          combinedText = textMatch ? textMatch[1].replace(/<[^>]*>/g, '') : url;
          metadata.authorUrl = oembed.author_url;
        }
      } catch (e) {
        console.warn('[Webhook] Twitter oEmbed failed:', e);
      }
    } else {
      // Generic webpage extraction
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyMemoryBot/1.0)' }
        });
        if (response.ok) {
          const html = await response.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1].trim() : '';

          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          description = descMatch ? descMatch[1].trim() : '';

          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogImageMatch) thumbnailUrl = ogImageMatch[1];

          // Extract main content
          const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                               html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
          if (articleMatch) {
            const cleanText = articleMatch[1]
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 8000);
            combinedText = [title, description, cleanText].filter(Boolean).join(' ') || url;
          } else {
            combinedText = [title, description].filter(Boolean).join(' ') || url;
          }
        }
      } catch (e) {
        console.warn('[Webhook] Webpage fetch failed:', e);
      }
    }

    // Update memory with enriched content
    const context = {
      url,
      type: urlType,
      title,
      description,
      author,
      thumbnailUrl,
      hasTranscript: !!transcript,
      enrichedAt: new Date().toISOString(),
      ...metadata
    };

    // Generate new embedding for enriched text
    let embedding: number[] | null = null;
    if (env.AI && combinedText !== url) {
      embedding = await generateEmbedding(env, combinedText);
    }

    // Update D1
    await env.DB.prepare(`
      UPDATE memory
      SET text = ?, context_json = ?, embedding_vector = ?, embedding_model = ?
      WHERE id = ?
    `).bind(
      combinedText.substring(0, 10000),
      JSON.stringify(context),
      embedding ? JSON.stringify(embedding) : null,
      embedding ? EMBEDDING_MODEL : null,
      memoryId
    ).run();

    // Update Vectorize
    if (embedding && env.VECTORIZE) {
      await insertVector(env, memoryId, embedding, {
        user_id: 'default_user',
        table: 'memory',
        type: urlType
      });
    }

    console.log('[Webhook] URL enriched:', memoryId, 'title:', title?.substring(0, 50), embedding ? '(with embedding)' : '');
  } catch (error) {
    console.error('[Webhook] URL enrichment failed:', error);
  }
}

/**
 * Helper function to save memory data to memory table
 * Returns { memoryId, isUrl, urlType } for potential enrichment
 */
async function saveMemoryToDatabase(c: any, userId: string, data: any): Promise<{ memoryId: string; isUrl: boolean; urlType: string | null; text: string; isDuplicate?: boolean }> {
  const text = data.text || '';

  // Detect if this is a URL and set appropriate tag
  const isUrlMemory = isUrl(text);
  const urlType = isUrlMemory ? detectUrlType(text) : null;
  const tag = data.context?.type === 'link' || isUrlMemory ? 'link' : (data.tag || null);

  // Check for duplicates - URLs are matched exactly, text is matched by hash
  const skipDuplicateCheck = data.skipDuplicateCheck === true;
  if (!skipDuplicateCheck) {
    if (isUrlMemory) {
      // For URLs, check for exact text match
      const existing = await c.env.DB.prepare(
        'SELECT id FROM memory WHERE user_id = ? AND text = ? LIMIT 1'
      ).bind(userId, text).first();

      if (existing) {
        console.log('[Webhook] Duplicate URL detected:', text, 'existing:', existing.id);
        return { memoryId: existing.id as string, isUrl: isUrlMemory, urlType, text, isDuplicate: true };
      }
    } else if (text.length > 50) {
      // For longer text, check for similar content using hash
      const hash = simpleHash(text);
      const recentMemories = await c.env.DB.prepare(
        'SELECT id, text FROM memory WHERE user_id = ? AND created_at > ? LIMIT 100'
      ).bind(userId, Date.now() - 24 * 60 * 60 * 1000).all();

      for (const mem of recentMemories.results || []) {
        if (simpleHash(mem.text as string) === hash) {
          console.log('[Webhook] Duplicate text detected (hash match):', mem.id);
          return { memoryId: mem.id as string, isUrl: false, urlType: null, text, isDuplicate: true };
        }
      }
    }
  }

  const memoryId = generateId('mem');

  // Generate embedding and keywords using Workers AI
  let embedding: number[] | null = null;
  let keywords: string[] = [];

  if (c.env.AI && text) {
    embedding = await generateEmbedding(c.env, text);
    keywords = extractKeywords(text);
  }

  // Merge context with URL type info
  const context = {
    ...(data.context || {}),
    ...(isUrlMemory ? { urlType, isUrl: true } : {})
  };

  await c.env.DB.prepare(
    `INSERT INTO memory (id, user_id, text, context_json, priority, tag, embedding_vector, embedding_model, search_keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    memoryId,
    userId,
    text,
    JSON.stringify(context),
    'medium',
    tag,
    embedding ? JSON.stringify(embedding) : null,
    embedding ? EMBEDDING_MODEL : null,
    keywords.length > 0 ? JSON.stringify(keywords) : null,
    Date.now()
  ).run();

  // Insert into Vectorize for semantic search
  if (embedding && c.env.VECTORIZE) {
    await insertVector(c.env, memoryId, embedding, {
      user_id: userId,
      table: 'memory',
      type: tag || 'memory'
    });
  }

  console.log('[Webhook] Saved to memory table:', memoryId, tag ? `(tag: ${tag})` : '', embedding ? '(with embedding + vectorize)' : '(no embedding)');
  return { memoryId, isUrl: isUrlMemory, urlType, text };
}

/**
 * Helper function to save processed text to posts table
 */
async function saveProcessedTextToDatabase(c: any, userId: string, data: any) {
  const postId = generateId('post');

  await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, type, mode, account, original_text, generated_output, language, status, context_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId,
    userId,
    'processed',
    data.mode || null,
    data.account || null,
    data.originalText || '',
    data.generatedContent || '',
    data.language || null,
    'completed',
    JSON.stringify(data.context || {}),
    Date.now()
  ).run();

  console.log('[Webhook] Saved processed text to posts table:', postId);
}

export default router;
