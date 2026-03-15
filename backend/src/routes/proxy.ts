import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

/**
 * POST /api/proxy/openrouter
 * Proxy requests to OpenRouter API
 * Keeps API keys secure on backend
 */
router.post('/openrouter', async (c) => {
  try {
    const { model, messages, ...otherOptions } = await c.req.json();

    if (!model || !messages) {
      return c.json({
        success: false,
        error: 'Missing required fields: model, messages'
      }, 400);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[Proxy] OPENROUTER_API_KEY not configured');
      return c.json({
        success: false,
        error: 'OpenRouter API not configured'
      }, 500);
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': c.env.APP_URL || 'https://text-processor.app',
        'X-Title': 'My Memory'
      },
      body: JSON.stringify({
        model,
        messages,
        ...otherOptions
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Proxy] OpenRouter error:', error);
      return c.json({
        success: false,
        error: 'OpenRouter API error',
        details: error
      }, response.status);
    }

    const data = await response.json();

    return c.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[Proxy] OpenRouter exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to proxy OpenRouter request'
    }, 500);
  }
});

/**
 * GET /api/proxy/youtube/transcript/:videoId
 * Fetch YouTube video transcript by parsing video page for caption URLs
 * More reliable than direct timedtext API
 */
router.get('/youtube/transcript/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const preferredLang = c.req.query('lang') || 'en';

    if (!videoId) {
      return c.json({
        success: false,
        error: 'Missing videoId parameter'
      }, 400);
    }

    const apiKey = c.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('[Proxy] YOUTUBE_API_KEY not configured');
      return c.json({
        success: false,
        error: 'YouTube API not configured'
      }, 500);
    }

    // Get video details using YouTube Data API (including statistics)
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`;
    const videoResponse = await fetch(videoDetailsUrl);

    if (!videoResponse.ok) {
      const error = await videoResponse.text();
      console.error('[Proxy] YouTube video details error:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch video details',
        details: error
      }, videoResponse.status);
    }

    const videoData = await videoResponse.json() as {
      items?: Array<{
        snippet?: {
          title?: string;
          description?: string;
          channelTitle?: string;
          channelId?: string;
          defaultAudioLanguage?: string;
          defaultLanguage?: string;
          publishedAt?: string;
          tags?: string[];
          categoryId?: string;
          thumbnails?: {
            default?: { url: string; width: number; height: number };
            medium?: { url: string; width: number; height: number };
            high?: { url: string; width: number; height: number };
            maxres?: { url: string; width: number; height: number };
          };
        };
        contentDetails?: {
          duration?: string;
          definition?: string;
          caption?: string;
        };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
          favoriteCount?: string;
        };
      }>;
    };

    const videoItem = videoData.items?.[0];
    if (!videoItem) {
      return c.json({
        success: false,
        error: 'Video not found'
      }, 404);
    }

    const videoLang = videoItem.snippet?.defaultAudioLanguage ||
                      videoItem.snippet?.defaultLanguage ||
                      preferredLang;

    let transcript: string | null = null;
    let transcriptSource = 'none';
    let transcriptLang: string | null = null;
    let transcriptSegments: Array<{ text: string; offset: number; duration: number }> = [];

    // Fetch transcript via transcript-worker (which uses Supadata API)
    // Use Service Binding for Worker-to-Worker communication
    const transcriptService = c.env.TRANSCRIPT_SERVICE;
    try {
      let transcriptResponse: Response;
      if (transcriptService) {
        // Use Service Binding - direct Worker-to-Worker call
        transcriptResponse = await transcriptService.fetch(`https://youtube-transcript-worker/transcript/${videoId}?lang=${preferredLang}`);
      } else {
        // Fallback to HTTP fetch (may not work for same-account workers)
        const transcriptWorkerUrl = `https://youtube-transcript-worker.kureckamichal.workers.dev/transcript/${videoId}?lang=${preferredLang}`;
        transcriptResponse = await fetch(transcriptWorkerUrl);
      }

      if (transcriptResponse.ok) {
        const transcriptData = await transcriptResponse.json() as {
          success: boolean;
          video_id: string;
          language?: string;
          text?: string;
          word_count?: number;
          segment_count?: number;
          segments?: Array<{
            text: string;
            offset: number;
            duration: number;
          }>;
          source?: string;
          error?: string;
        };

        if (transcriptData.success && transcriptData.text) {
          transcript = transcriptData.text;
          transcriptLang = transcriptData.language || preferredLang;
          transcriptSegments = transcriptData.segments || [];
          transcriptSource = transcriptData.source || 'transcript-worker';
        } else if (transcriptData.error) {
          console.log('[Proxy] Transcript worker error:', transcriptData.error);
        }
      } else {
        console.log('[Proxy] Transcript worker HTTP error:', transcriptResponse.status);
      }
    } catch (transcriptError) {
      console.log('[Proxy] Failed to fetch transcript from worker:', transcriptError);
    }

    // Parse duration from ISO 8601 format (PT49M37S -> 49:37)
    const parseDuration = (isoDuration: string | undefined): string => {
      if (!isoDuration) return '0:00';
      const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return '0:00';
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      const seconds = parseInt(match[3] || '0');
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Format view count (1234567 -> 1.2M)
    const formatCount = (count: string | undefined): string => {
      if (!count) return '0';
      const num = parseInt(count);
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return count;
    };

    return c.json({
      success: true,
      data: {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: videoItem.snippet?.title || 'Unknown',
        description: videoItem.snippet?.description || '',
        channel: {
          name: videoItem.snippet?.channelTitle || 'Unknown',
          id: videoItem.snippet?.channelId || null,
          url: videoItem.snippet?.channelId
            ? `https://www.youtube.com/channel/${videoItem.snippet.channelId}`
            : null
        },
        publishedAt: videoItem.snippet?.publishedAt || null,
        duration: {
          iso: videoItem.contentDetails?.duration || '',
          formatted: parseDuration(videoItem.contentDetails?.duration)
        },
        statistics: {
          views: videoItem.statistics?.viewCount || '0',
          viewsFormatted: formatCount(videoItem.statistics?.viewCount),
          likes: videoItem.statistics?.likeCount || '0',
          likesFormatted: formatCount(videoItem.statistics?.likeCount),
          comments: videoItem.statistics?.commentCount || '0',
          commentsFormatted: formatCount(videoItem.statistics?.commentCount)
        },
        thumbnails: {
          default: videoItem.snippet?.thumbnails?.default?.url || null,
          medium: videoItem.snippet?.thumbnails?.medium?.url || null,
          high: videoItem.snippet?.thumbnails?.high?.url || null,
          maxres: videoItem.snippet?.thumbnails?.maxres?.url || null
        },
        tags: videoItem.snippet?.tags || [],
        language: videoLang,
        definition: videoItem.contentDetails?.definition || 'unknown',
        hasCaptions: videoItem.contentDetails?.caption === 'true',
        transcript: {
          available: !!transcript,
          text: transcript,
          language: transcriptLang,
          source: transcriptSource,
          wordCount: transcript ? transcript.split(/\s+/).length : 0,
          segmentCount: transcriptSegments.length,
          segments: transcriptSegments
        }
      }
    });

  } catch (error) {
    console.error('[Proxy] YouTube transcript exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch YouTube transcript'
    }, 500);
  }
});

/**
 * GET /api/proxy/text-models
 * Fetch available text generation models from OpenRouter
 */
router.get('/text-models', async (c) => {
  try {
    const skipCache = c.req.query('refresh') === 'true';

    if (!skipCache) {
      const cached = await c.env.CACHE.get('openrouter_text_models');
      if (cached) {
        return c.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        pricing?: { prompt?: string; completion?: string };
        context_length?: number;
        architecture?: { input_modalities?: string[]; output_modalities?: string[] };
      }>;
    };

    // Filter models that support text input and output (most chat models)
    const textModels = data.data
      .filter(m => {
        const inputs = m.architecture?.input_modalities || ['text'];
        const outputs = m.architecture?.output_modalities || ['text'];
        return inputs.includes('text') && outputs.includes('text');
      })
      .map(m => ({
        id: m.id,
        name: m.name,
        description: m.description?.substring(0, 100),
        contextLength: m.context_length,
        pricing: m.pricing?.completion || 'unknown'
      }))
      .slice(0, 100); // Limit to top 100 models

    await c.env.CACHE.put('openrouter_text_models', JSON.stringify(textModels), {
      expirationTtl: 3600
    });

    return c.json({ success: true, data: textModels, cached: false });

  } catch (error) {
    console.error('[Proxy] Fetch text models error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch models'
    }, 500);
  }
});

/**
 * GET /api/proxy/vision-models
 * Fetch models with image/vision input capability from OpenRouter
 */
router.get('/vision-models', async (c) => {
  try {
    const skipCache = c.req.query('refresh') === 'true';

    if (!skipCache) {
      const cached = await c.env.CACHE.get('openrouter_vision_models');
      if (cached) {
        return c.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        pricing?: { prompt?: string; completion?: string };
        context_length?: number;
        architecture?: { input_modalities?: string[]; output_modalities?: string[] };
      }>;
    };

    // Filter models that support image input (vision models)
    const visionModels = data.data
      .filter(m => {
        const inputs = m.architecture?.input_modalities || [];
        return inputs.includes('image');
      })
      .map(m => ({
        id: m.id,
        name: m.name,
        description: m.description?.substring(0, 100),
        contextLength: m.context_length,
        pricing: m.pricing?.completion || 'unknown'
      }));

    await c.env.CACHE.put('openrouter_vision_models', JSON.stringify(visionModels), {
      expirationTtl: 3600
    });

    return c.json({ success: true, data: visionModels, cached: false });

  } catch (error) {
    console.error('[Proxy] Fetch vision models error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch models'
    }, 500);
  }
});

/**
 * GET /api/proxy/health
 * Health check for proxy endpoints
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Proxy endpoints are healthy',
    endpoints: {
      openrouter: '/api/proxy/openrouter',
      youtubeTranscript: '/api/proxy/youtube/transcript/:videoId',
      textModels: '/api/proxy/text-models',
      visionModels: '/api/proxy/vision-models'
    },
    timestamp: Date.now()
  });
});

export default router;
