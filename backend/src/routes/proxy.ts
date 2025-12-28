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
 * POST /api/proxy/html-to-image
 * Proxy requests to html-to-image worker
 * Keeps worker endpoint and API key secure
 */
router.post('/html-to-image', async (c) => {
  try {
    const { html, width, height, format } = await c.req.json();

    if (!html || !width || !height) {
      return c.json({
        success: false,
        error: 'Missing required fields: html, width, height'
      }, 400);
    }

    const workerEndpoint = c.env.HTML_TO_IMAGE_WORKER_URL ||
      'https://html-to-image-worker.kureckamichal.workers.dev/render';

    const workerApiKey = c.env.HTML_TO_IMAGE_WORKER_API_KEY || '';


    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (workerApiKey) {
      headers['X-API-Key'] = workerApiKey;  // Recommended authentication method
    }

    const requestBody = {
      html,
      width,
      height,
      format: format || 'png'
    };

    // Use Service Binding if available (for Worker-to-Worker communication)
    // This avoids the 1042 error when workers try to fetch each other via HTTP
    const serviceBinding = c.env.HTML_TO_IMAGE_SERVICE;

    console.log('[Proxy] HTML-to-Image request:', {
      useServiceBinding: !!serviceBinding,
      bodySize: JSON.stringify(requestBody).length
    });

    let response: Response;

    if (serviceBinding) {
      // Use Service Binding - direct Worker-to-Worker call
      response = await serviceBinding.fetch('https://html-to-image-worker/render', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    } else {
      // Fallback to HTTP fetch (may not work for same-account workers)
      response = await fetch(workerEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] HTML-to-Image error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return c.json({
        success: false,
        error: 'HTML-to-Image worker error',
        details: errorText,
        status: response.status
      }, response.status);
    }

    const data = await response.json();

    return c.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[Proxy] HTML-to-Image exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to proxy HTML-to-Image request'
    }, 500);
  }
});

/**
 * POST /api/proxy/image
 * Proxy requests to OpenRouter for AI image generation
 * Uses OpenRouter's multimodal models with image output
 * Keeps API keys secure on backend
 */
router.post('/image', async (c) => {
  try {
    const { prompt, style, aspectRatio, model } = await c.req.json();

    if (!prompt) {
      return c.json({
        success: false,
        error: 'Missing required field: prompt'
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

    const styleDescriptions: Record<string, string> = {
      'vivid': 'dramatic, hyper-realistic, vibrant colors, high contrast',
      'natural': 'realistic, subtle, natural lighting, soft colors'
    };

    // Build the image generation prompt
    const imagePrompt = `Generate an image: ${prompt}. Style: ${styleDescriptions[style] || styleDescriptions['vivid']}. Aspect ratio: ${aspectRatio || '1:1'}.`;

    const selectedModel = model || 'google/gemini-2.5-flash-image';

    console.log('[Proxy] Image generation request via OpenRouter:', {
      promptLength: imagePrompt.length,
      style: style || 'vivid',
      aspectRatio: aspectRatio || '1:1',
      model: selectedModel
    });

    // Use OpenRouter's chat completions API with multimodal models
    // Content must be an array of typed objects per OpenRouter docs
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': c.env.APP_URL || 'https://text-processor.app',
        'X-Title': 'My Memory'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: imagePrompt
            }
          ]
        }],
        // Request image output modality - required for image generation
        modalities: ['text', 'image']
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Proxy] OpenRouter image generation error:', error);
      return c.json({
        success: false,
        error: 'Image generation API error',
        details: error
      }, response.status);
    }

    const data = await response.json() as {
      choices?: Array<{
        finish_reason?: string;
        native_finish_reason?: string;
        message?: {
          content?: string | Array<{
            type: string;
            image_url?: { url: string };
            text?: string;
          }>;
          // OpenRouter returns images in a separate 'images' array
          images?: Array<{
            url?: string;
            b64_json?: string;
          }>;
        };
      }>;
    };

    const choice = data.choices?.[0];
    const message = choice?.message as any; // Use any to access dynamic fields

    console.log('[Proxy] OpenRouter full response:', JSON.stringify(data).substring(0, 2000));
    console.log('[Proxy] OpenRouter response parsed:', {
      hasChoices: !!data.choices,
      finishReason: choice?.finish_reason,
      nativeFinishReason: choice?.native_finish_reason,
      hasImages: !!message?.images,
      imagesLength: message?.images?.length,
      contentType: typeof message?.content,
      contentIsArray: Array.isArray(message?.content),
      contentLength: Array.isArray(message?.content) ? message.content.length : (typeof message?.content === 'string' ? message.content.length : 0),
      messageKeys: message ? Object.keys(message) : []
    });

    // Check for safety block or content filter
    if (choice?.native_finish_reason === 'IMAGE_SAFETY' ||
        choice?.native_finish_reason === 'SAFETY' ||
        choice?.finish_reason === 'content_filter') {
      return c.json({
        success: false,
        error: 'Image generation blocked by safety filter. Try a different prompt.',
        code: 'SAFETY_FILTER'
      }, 400);
    }

    // Extract image from response
    let imageUrl: string | null = null;

    // First check for images array (OpenRouter format)
    // Images can be: { url: "..." } or { type: "image_url", image_url: { url: "..." } }
    if (message?.images && message.images.length > 0) {
      const img = message.images[0];
      if (img.url) {
        imageUrl = img.url;
      } else if (img.image_url?.url) {
        // OpenRouter Gemini format: { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
        imageUrl = img.image_url.url;
      } else if (img.b64_json) {
        imageUrl = `data:image/png;base64,${img.b64_json}`;
      }
    }

    // Fallback: check content array for image parts
    if (!imageUrl && Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          imageUrl = part.image_url.url;
          break;
        }
        if (part.type === 'image' && (part as any).url) {
          imageUrl = (part as any).url;
          break;
        }
        if (part.type === 'image' && (part as any).b64_json) {
          imageUrl = `data:image/png;base64,${(part as any).b64_json}`;
          break;
        }
      }
    }

    // Fallback: check if content is a data URL string
    if (!imageUrl && typeof message?.content === 'string') {
      if (message.content.startsWith('data:image')) {
        imageUrl = message.content;
      } else if (message.content.startsWith('http')) {
        imageUrl = message.content;
      }
    }

    if (!imageUrl) {
      console.error('[Proxy] No image in response:', JSON.stringify(data).substring(0, 1000));
      return c.json({
        success: false,
        error: 'No image generated. The model returned no image data.',
        details: JSON.stringify(data).substring(0, 500)
      }, 400);
    }

    // Save image to R2 storage
    let r2Url: string | null = null;
    try {
      // Extract base64 data from data URL
      if (imageUrl.startsWith('data:image/')) {
        const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const imageFormat = matches[1]; // png, jpeg, etc.
          const base64Data = matches[2];
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          // Generate unique filename
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 10);
          const filename = `ai-images/${timestamp}-${randomId}.${imageFormat}`;

          // Upload to R2
          await c.env.STORAGE.put(filename, binaryData, {
            httpMetadata: {
              contentType: `image/${imageFormat}`
            },
            customMetadata: {
              model: selectedModel,
              prompt: prompt.substring(0, 200),
              generatedAt: new Date().toISOString()
            }
          });

          // Construct URL to serve through our API
          r2Url = `${c.env.APP_URL}/api/proxy/ai-images/${timestamp}-${randomId}.${imageFormat}`;
          console.log('[Proxy] Image saved to R2:', filename, '-> URL:', r2Url);
        }
      }
    } catch (r2Error) {
      console.error('[Proxy] Failed to save image to R2:', r2Error);
      // Continue without R2 URL - still return the base64 image
    }

    return c.json({
      success: true,
      url: r2Url || imageUrl,
      originalUrl: imageUrl.startsWith('data:') ? undefined : imageUrl,
      r2Url,
      data: { url: r2Url || imageUrl }
    });

  } catch (error) {
    console.error('[Proxy] Image generation exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image'
    }, 500);
  }
});

/**
 * GET /api/proxy/image-models
 * Fetch available image generation models from OpenRouter
 * Filters models that have "image" in output_modalities
 */
router.get('/image-models', async (c) => {
  try {
    const skipCache = c.req.query('refresh') === 'true';

    // Try to get from cache first
    if (!skipCache) {
      const cached = await c.env.CACHE.get('openrouter_image_models');
      if (cached) {
        return c.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        pricing?: {
          prompt?: string;
          completion?: string;
          image?: string;
        };
        architecture?: {
          output_modalities?: string[];
        };
      }>;
    };

    // Filter models with image output capability (nested under architecture)
    const imageModels = data.data
      .filter(m => m.architecture?.output_modalities?.includes('image'))
      .map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        pricing: m.pricing?.image || m.pricing?.completion || 'unknown'
      }));

    // Cache for 1 hour
    await c.env.CACHE.put('openrouter_image_models', JSON.stringify(imageModels), {
      expirationTtl: 3600
    });

    return c.json({
      success: true,
      data: imageModels,
      cached: false
    });

  } catch (error) {
    console.error('[Proxy] Fetch image models error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch image models'
    }, 500);
  }
});

/**
 * GET /api/proxy/ai-images
 * List all AI-generated images from R2 storage
 */
router.get('/ai-images', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const cursor = c.req.query('cursor');

    const listOptions: R2ListOptions = {
      prefix: 'ai-images/',
      limit,
      include: ['customMetadata', 'httpMetadata']
    };
    if (cursor) {
      listOptions.cursor = cursor;
    }

    const listed = await c.env.STORAGE.list(listOptions);

    const appUrl = c.env.APP_URL;
    const images = listed.objects.map(obj => {
      const filename = obj.key.replace('ai-images/', '');
      return {
        filename,
        url: `${appUrl}/api/proxy/ai-images/${filename}`,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
        metadata: obj.customMetadata || {}
      };
    });

    // Sort by upload date (newest first)
    images.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    return c.json({
      success: true,
      data: images,
      count: images.length,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined
    });
  } catch (error) {
    console.error('[Proxy] Failed to list images:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list images'
    }, 500);
  }
});

/**
 * GET /api/proxy/ai-images/:filename
 * Serve AI-generated images from R2 storage
 */
router.get('/ai-images/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');
    const key = `ai-images/${filename}`;

    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('[Proxy] Failed to serve image:', error);
    return c.json({ success: false, error: 'Failed to serve image' }, 500);
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
 * POST /api/proxy/generate-carousel-content
 * Generate carousel slide content from a topic using AI
 */
router.post('/generate-carousel-content', async (c) => {
  try {
    const { topic, slideCount, style } = await c.req.json();

    if (!topic) {
      return c.json({
        success: false,
        error: 'Missing required field: topic'
      }, 400);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({
        success: false,
        error: 'OpenRouter API not configured'
      }, 500);
    }

    const numSlides = Math.min(Math.max(slideCount || 5, 2), 10);
    const contentStyle = style || 'educational';

    const styleGuides: Record<string, string> = {
      educational: 'informative, clear explanations, step-by-step format',
      motivational: 'inspiring, uplifting, action-oriented quotes',
      tips: 'practical tips, numbered lists, actionable advice',
      storytelling: 'narrative format, engaging story arc, emotional hooks',
      facts: 'interesting facts, statistics, surprising information'
    };

    const prompt = `Create content for a ${numSlides}-slide Instagram carousel about: "${topic}"

Style: ${styleGuides[contentStyle] || styleGuides.educational}

Requirements:
- Slide 1: Hook/Title that grabs attention
- Slides 2-${numSlides - 1}: Main content points (one key idea per slide)
- Slide ${numSlides}: Call-to-action or summary

Format your response as JSON array with exactly ${numSlides} slides:
[
  {"slide": 1, "text": "Your hook text here"},
  {"slide": 2, "text": "First key point"},
  ...
]

Keep each slide text concise (max 100 characters for best readability).
Use emojis sparingly if appropriate.
Return ONLY the JSON array, no other text.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': c.env.APP_URL || 'https://my-memory.app',
        'X-Title': 'My Memory Carousel Generator'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Proxy] Carousel content generation error:', error);
      return c.json({
        success: false,
        error: 'AI generation failed',
        details: error
      }, response.status);
    }

    const aiResponse = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let slides: Array<{ slide: number; text: string }> = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        slides = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[Proxy] Failed to parse carousel content:', parseError);
      // Fallback: split by newlines
      const lines = content.split('\n').filter(l => l.trim());
      slides = lines.slice(0, numSlides).map((text, i) => ({
        slide: i + 1,
        text: text.replace(/^\d+[\.\)]\s*/, '').trim()
      }));
    }

    return c.json({
      success: true,
      slides,
      topic,
      slideCount: slides.length
    });

  } catch (error) {
    console.error('[Proxy] Carousel content exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content'
    }, 500);
  }
});

/**
 * POST /api/proxy/carousel-slide
 * Generate a single carousel slide image from HTML
 * Uses html-to-image-worker and saves to R2
 */
router.post('/carousel-slide', async (c) => {
  try {
    const { html, width, height, format, slideIndex, totalSlides } = await c.req.json();

    if (!html || !width || !height) {
      return c.json({
        success: false,
        error: 'Missing required fields: html, width, height'
      }, 400);
    }

    const serviceBinding = c.env.HTML_TO_IMAGE_SERVICE;
    const workerEndpoint = c.env.HTML_TO_IMAGE_WORKER_URL ||
      'https://html-to-image-worker.kureckamichal.workers.dev/render';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const workerApiKey = c.env.HTML_TO_IMAGE_WORKER_API_KEY || '';
    if (workerApiKey) {
      headers['X-API-Key'] = workerApiKey;
    }

    const requestBody = {
      html,
      width,
      height,
      format: format || 'png'
    };

    const startTime = Date.now();
    console.log('[Proxy] Carousel slide generation START:', {
      slideIndex,
      totalSlides,
      useServiceBinding: !!serviceBinding,
      htmlLength: html.length,
      hasApiKey: !!workerApiKey
    });

    let response: Response;

    // Use service binding for worker-to-worker communication
    // HTTP subrequests between workers on the same account can fail with 1042
    if (serviceBinding) {
      console.log('[Proxy] Using service binding for slide', slideIndex);
      response = await serviceBinding.fetch('https://html-to-image-worker/render', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    } else {
      console.log('[Proxy] Using HTTP endpoint for slide', slideIndex);
      response = await fetch(workerEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    }

    const fetchTime = Date.now() - startTime;
    console.log('[Proxy] Carousel slide response received:', {
      slideIndex,
      status: response.status,
      fetchTimeMs: fetchTime
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] Carousel slide error:', {
        slideIndex,
        status: response.status,
        error: errorText,
        fetchTimeMs: fetchTime
      });
      return c.json({
        success: false,
        error: 'Failed to render carousel slide',
        details: errorText,
        slideIndex
      }, response.status);
    }

    const data = await response.json() as {
      success: boolean;
      imageUrl?: string;
      image?: string;
      url?: string;
      data?: { imageUrl?: string; image?: string; url?: string };
      error?: string;
    };

    console.log('[Proxy] HTML-to-Image response keys:', Object.keys(data));
    console.log('[Proxy] HTML-to-Image data.data keys:', data.data ? Object.keys(data.data) : 'no data field');
    console.log('[Proxy] HTML-to-Image data.data preview:', data.data ? JSON.stringify(data.data).substring(0, 200) : 'null');

    // Try multiple response formats - check nested data field first
    const nestedData = data.data as Record<string, unknown> | undefined;
    let imageUrl = data.imageUrl || data.image || data.url ||
      nestedData?.imageUrl || nestedData?.image || nestedData?.url ||
      nestedData?.dataUrl || nestedData?.base64 || nestedData?.imageData;

    // If still no imageUrl, check if data itself is a string (base64 image)
    if (!imageUrl && typeof data.data === 'string') {
      imageUrl = data.data;
    }

    // Check for image size - the worker returns 1000 byte placeholder when overloaded
    const imageSize = nestedData?.size as number | undefined;
    console.log('[Proxy] Extracted imageUrl type:', typeof imageUrl, 'size:', imageSize, 'starts with:', typeof imageUrl === 'string' ? imageUrl.substring(0, 50) : 'N/A');

    // Validate image size - a real 1080x1080 carousel slide should be at least 10KB
    // The worker returns exactly 1000 bytes when it fails silently
    if (imageSize && imageSize < 5000) {
      console.error('[Proxy] Carousel image too small (likely placeholder):', {
        slideIndex,
        size: imageSize,
        url: imageUrl
      });
      return c.json({
        success: false,
        error: 'Renderer returned placeholder image - worker may be overloaded',
        details: `Image size ${imageSize} bytes is too small for a carousel slide`,
        retryable: true
      }, 503);
    }

    if (!data.success || !imageUrl) {
      console.error('[Proxy] Carousel no image in response:', JSON.stringify(data).substring(0, 500));
      return c.json({
        success: false,
        error: data.error || 'No image returned from renderer',
        details: JSON.stringify(data).substring(0, 200)
      }, 400);
    }

    // Save to R2 storage
    let r2Url: string | null = null;
    try {
      if (imageUrl.startsWith('data:image/')) {
        const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const imageFormat = matches[1];
          const base64Data = matches[2];
          const binaryData = Uint8Array.from(atob(base64Data), ch => ch.charCodeAt(0));

          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 10);
          const filename = `carousels/${timestamp}-${randomId}/slide-${slideIndex || 1}.${imageFormat}`;

          await c.env.STORAGE.put(filename, binaryData, {
            httpMetadata: {
              contentType: `image/${imageFormat}`
            },
            customMetadata: {
              type: 'carousel-slide',
              slideIndex: String(slideIndex || 1),
              totalSlides: String(totalSlides || 1),
              generatedAt: new Date().toISOString()
            }
          });

          r2Url = `${c.env.APP_URL}/api/proxy/carousel-images/${timestamp}-${randomId}/slide-${slideIndex || 1}.${imageFormat}`;
          console.log('[Proxy] Carousel slide saved to R2:', filename);
        }
      }
    } catch (r2Error) {
      console.error('[Proxy] Failed to save carousel slide to R2:', r2Error);
    }

    const totalTime = Date.now() - startTime;
    console.log('[Proxy] Carousel slide SUCCESS:', {
      slideIndex,
      totalTimeMs: totalTime,
      hasR2Url: !!r2Url
    });

    return c.json({
      success: true,
      url: r2Url || imageUrl,
      slideIndex,
      totalSlides
    });

  } catch (error) {
    console.error('[Proxy] Carousel slide exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate carousel slide'
    }, 500);
  }
});

/**
 * GET /api/proxy/carousel-images/:carouselId/:filename
 * Serve carousel images from R2 storage
 */
router.get('/carousel-images/:carouselId/:filename', async (c) => {
  try {
    const carouselId = c.req.param('carouselId');
    const filename = c.req.param('filename');
    const key = `carousels/${carouselId}/${filename}`;

    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('[Proxy] Failed to serve carousel image:', error);
    return c.json({ success: false, error: 'Failed to serve image' }, 500);
  }
});

/**
 * POST /api/proxy/carousels
 * Save a completed carousel to the database
 */
router.post('/carousels', async (c) => {
  try {
    const { title, slides, template, primaryColor } = await c.req.json();

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return c.json({ success: false, error: 'Slides array is required' }, 400);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO carousels (title, slide_count, slides, template, primary_color)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      title || `Carousel ${new Date().toLocaleDateString()}`,
      slides.length,
      JSON.stringify(slides),
      template || 'gradient',
      primaryColor || '#667eea'
    ).run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: 'Carousel saved successfully'
    });
  } catch (error) {
    console.error('[Proxy] Failed to save carousel:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save carousel'
    }, 500);
  }
});

/**
 * GET /api/proxy/carousels
 * List all carousels from the database
 */
router.get('/carousels', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');

    const result = await c.env.DB.prepare(
      `SELECT id, title, slide_count, slides, template, primary_color, created_at
       FROM carousels
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(limit).all();

    const carousels = (result.results || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      slideCount: row.slide_count,
      slides: JSON.parse(row.slides as string || '[]'),
      template: row.template,
      primaryColor: row.primary_color,
      createdAt: row.created_at
    }));

    return c.json({
      success: true,
      data: carousels,
      count: carousels.length
    });
  } catch (error) {
    console.error('[Proxy] Failed to list carousels:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list carousels'
    }, 500);
  }
});

/**
 * DELETE /api/proxy/carousels/:id
 * Delete a carousel from the database
 */
router.delete('/carousels/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM carousels WHERE id = ?').bind(id).run();

    return c.json({
      success: true,
      message: 'Carousel deleted successfully'
    });
  } catch (error) {
    console.error('[Proxy] Failed to delete carousel:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete carousel'
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
      htmlToImage: '/api/proxy/html-to-image',
      image: '/api/proxy/image',
      imageModels: '/api/proxy/image-models',
      carouselSlide: '/api/proxy/carousel-slide',
      carousels: '/api/proxy/carousels',
      youtubeTranscript: '/api/proxy/youtube/transcript/:videoId'
    },
    timestamp: Date.now()
  });
});

export default router;
