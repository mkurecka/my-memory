import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';
import { generateEmbedding, extractKeywords, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';
import { isUrl, detectUrlType, enrichUrlMemory } from '../utils/url';
import { simpleHash, ensureUserExists } from '../utils/helpers';

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

// URL helpers (isUrl, detectUrlType, extractYouTubeVideoId, enrichUrlMemory) imported from ../utils/url

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
