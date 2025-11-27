/**
 * Mobile API routes - simplified endpoints for iOS Shortcuts / automation
 * These endpoints are designed to be called easily from mobile automation tools
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';

const router = new Hono<{ Bindings: Env }>();

// Default user for mobile saves (can be customized via header)
const DEFAULT_MOBILE_USER = 'mobile_user';

/**
 * POST /api/mobile/save-text
 * Simple endpoint to save text from iOS Shortcuts
 *
 * Body: { text: string, source?: string, tags?: string }
 * Or just plain text in body
 */
router.post('/save-text', async (c) => {
  try {
    let text: string;
    let source: string | null = null;
    let tags: string[] = [];

    const contentType = c.req.header('Content-Type') || '';

    // Support both JSON and plain text
    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      text = body.text;
      source = body.source || body.url || null;
      tags = body.tags ? (typeof body.tags === 'string' ? body.tags.split(',').map((t: string) => t.trim()) : body.tags) : [];
    } else {
      // Plain text body
      text = await c.req.text();
    }

    if (!text || text.trim().length === 0) {
      return c.json({ success: false, error: 'No text provided' }, 400);
    }

    // Get user ID from header or use default
    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;

    // Ensure user exists
    await ensureUserExists(c, userId);

    // Save to memory table
    const memoryId = generateId('mem');
    const contextJson = JSON.stringify({
      url: source,
      tags,
      savedFrom: 'ios_shortcut',
      savedAt: new Date().toISOString()
    });

    // Use tag field for first tag if provided
    const primaryTag = tags.length > 0 ? tags[0] : null;

    await c.env.DB.prepare(`
      INSERT INTO memory (id, user_id, text, context_json, tag, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      memoryId,
      userId,
      text.trim(),
      contextJson,
      primaryTag,
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Text saved!',
      id: memoryId,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });

  } catch (error) {
    console.error('[Mobile] save-text error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save text'
    }, 500);
  }
});

/**
 * POST /api/mobile/save-tweet
 * Save a tweet from iOS Shortcuts
 *
 * Body: { url: string, text?: string, author?: string }
 */
router.post('/save-tweet', async (c) => {
  try {
    const body = await c.req.json();
    const { url, text, author } = body;

    if (!url) {
      return c.json({ success: false, error: 'No tweet URL provided' }, 400);
    }

    // Extract tweet ID from URL
    const tweetIdMatch = url.match(/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;
    await ensureUserExists(c, userId);

    const postId = generateId('post');
    const contextJson = JSON.stringify({
      tweetId,
      author: author || 'Unknown',
      url,
      savedFrom: 'ios_shortcut',
      savedAt: new Date().toISOString()
    });

    await c.env.DB.prepare(`
      INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      userId,
      'tweet',
      text || url,
      contextJson,
      'saved',
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Tweet saved!',
      id: postId,
      tweetId
    });

  } catch (error) {
    console.error('[Mobile] save-tweet error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save tweet'
    }, 500);
  }
});

/**
 * POST /api/mobile/save-youtube
 * Save a YouTube video from iOS Shortcuts
 *
 * Body: { url: string, title?: string, channel?: string }
 */
router.post('/save-youtube', async (c) => {
  try {
    const body = await c.req.json();
    const { url, title, channel } = body;

    if (!url) {
      return c.json({ success: false, error: 'No YouTube URL provided' }, 400);
    }

    // Extract video ID from URL
    let videoId: string | null = null;
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    const embedMatch = url.match(/embed\/([^?&]+)/);
    videoId = watchMatch?.[1] || shortMatch?.[1] || embedMatch?.[1] || null;

    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;
    await ensureUserExists(c, userId);

    const postId = generateId('post');
    const contextJson = JSON.stringify({
      videoId,
      title: title || 'Untitled',
      channelName: channel || 'Unknown',
      url,
      savedFrom: 'ios_shortcut',
      savedAt: new Date().toISOString()
    });

    await c.env.DB.prepare(`
      INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      userId,
      'youtube_video',
      title || url,
      contextJson,
      'saved',
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Video saved!',
      id: postId,
      videoId
    });

  } catch (error) {
    console.error('[Mobile] save-youtube error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save video'
    }, 500);
  }
});

/**
 * POST /api/mobile/save
 * Universal save endpoint - auto-detects content type from URL
 *
 * Detects:
 * - x.com, twitter.com → saves as tweet (with optional text from share sheet)
 * - youtube.com, youtu.be → saves as video, fetches video data
 * - anything else → saves as memory/text
 *
 * Body options:
 * - Plain text: Just the URL or text
 * - JSON: { text: "url or text", content?: "optional tweet/video content" }
 *
 * iOS Shortcut tip: Use "Get Text from Input" to capture shared text,
 * then send both URL and content for tweets.
 */
router.post('/save', async (c) => {
  try {
    let input: string;
    let additionalContent: string | undefined;
    const contentType = c.req.header('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      input = body.text || body.url || body.input || '';
      additionalContent = body.content || body.tweetText || body.description;
    } else {
      input = await c.req.text();
    }

    input = input.trim();

    if (!input) {
      return c.json({ success: false, error: 'No input provided' }, 400);
    }

    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;
    await ensureUserExists(c, userId);

    // Detect content type from input
    const lowerInput = input.toLowerCase();

    // Twitter/X detection
    if (lowerInput.includes('x.com/') || lowerInput.includes('twitter.com/')) {
      return await saveTweetFromUrl(c, userId, input, additionalContent);
    }

    // YouTube detection
    if (lowerInput.includes('youtube.com/') || lowerInput.includes('youtu.be/')) {
      return await saveYouTubeFromUrl(c, userId, input);
    }

    // Default: save as text/memory
    return await saveAsMemory(c, userId, input);

  } catch (error) {
    console.error('[Mobile] save error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save'
    }, 500);
  }
});

/**
 * Fetch tweet data using FxTwitter API (free, no auth required)
 */
async function fetchTweetData(tweetId: string, username: string): Promise<{
  text: string;
  author: { name: string; username: string; avatar?: string };
  media?: { images?: string[]; videos?: string[] };
  stats?: { likes: number; retweets: number; replies: number };
  createdAt?: string;
} | null> {
  try {
    // FxTwitter API - free and reliable
    const apiUrl = `https://api.fxtwitter.com/${username}/status/${tweetId}`;
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'UniversalTextProcessor/1.0' }
    });

    if (!response.ok) {
      console.log('[Mobile] FxTwitter API failed:', response.status);
      return null;
    }

    const data = await response.json() as any;

    if (data.code !== 200 || !data.tweet) {
      console.log('[Mobile] FxTwitter returned no tweet data');
      return null;
    }

    const tweet = data.tweet;

    // Extract media
    const images: string[] = [];
    const videos: string[] = [];

    if (tweet.media?.photos) {
      for (const photo of tweet.media.photos) {
        if (photo.url) images.push(photo.url);
      }
    }

    if (tweet.media?.videos) {
      for (const video of tweet.media.videos) {
        if (video.url) videos.push(video.url);
      }
    }

    return {
      text: tweet.text || '',
      author: {
        name: tweet.author?.name || username,
        username: tweet.author?.screen_name || username,
        avatar: tweet.author?.avatar_url
      },
      media: {
        images: images.length > 0 ? images : undefined,
        videos: videos.length > 0 ? videos : undefined
      },
      stats: {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0
      },
      createdAt: tweet.created_at
    };
  } catch (error) {
    console.log('[Mobile] Error fetching tweet:', error);
    return null;
  }
}

/**
 * Save tweet from URL - extracts tweet ID and fetches data via FxTwitter
 * Falls back to provided content if API fetch fails
 */
async function saveTweetFromUrl(c: any, userId: string, url: string, providedContent?: string) {
  // Extract tweet ID
  const tweetIdMatch = url.match(/status\/(\d+)/);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  // Extract username from URL
  const usernameMatch = url.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/);
  const username = usernameMatch ? usernameMatch[1] : null;

  // Try to fetch tweet data
  let tweetText = providedContent || url; // Use provided content as fallback
  let authorName = username || 'Unknown';
  let authorUsername = username || '';
  let authorAvatar: string | undefined;
  let media: { images?: string[]; videos?: string[] } = {};
  let stats: { likes: number; retweets: number; replies: number } | undefined;
  let tweetCreatedAt: string | undefined;
  let fetchedFromApi = false;

  if (tweetId && username) {
    const tweetData = await fetchTweetData(tweetId, username);
    if (tweetData) {
      tweetText = tweetData.text;
      authorName = tweetData.author.name;
      authorUsername = tweetData.author.username;
      authorAvatar = tweetData.author.avatar;
      media = tweetData.media || {};
      stats = tweetData.stats;
      tweetCreatedAt = tweetData.createdAt;
      fetchedFromApi = true;
    }
  }

  const postId = generateId('post');
  const contextJson = JSON.stringify({
    tweetId,
    url,
    author: {
      displayName: authorName,
      username: authorUsername,
      avatar: authorAvatar
    },
    media,
    stats,
    tweetCreatedAt,
    savedFrom: 'ios_shortcut',
    savedAt: new Date().toISOString()
  });

  await c.env.DB.prepare(`
    INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    userId,
    'tweet',
    tweetText,
    contextJson,
    'saved',
    Date.now()
  ).run();

  const hasContent = tweetText !== url;

  return c.json({
    success: true,
    message: hasContent ? '🐦 Tweet saved with content!' : '🐦 Tweet URL saved!',
    type: 'tweet',
    id: postId,
    tweetId,
    author: authorName,
    text: tweetText.substring(0, 100) + (tweetText.length > 100 ? '...' : ''),
    hasMedia: (media.images?.length || 0) + (media.videos?.length || 0) > 0,
    fetchedFromApi,
    tip: !hasContent ? 'Tip: Include tweet text with "content" field for full capture' : undefined
  });
}

/**
 * Save YouTube video from URL - extracts video ID and fetches metadata
 */
async function saveYouTubeFromUrl(c: any, userId: string, url: string) {
  // Extract video ID
  let videoId: string | null = null;
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  const embedMatch = url.match(/embed\/([^?&]+)/);
  videoId = watchMatch?.[1] || shortMatch?.[1] || embedMatch?.[1] || null;

  // Try to fetch video title from YouTube oEmbed API (no API key needed)
  let title = 'YouTube Video';
  let channelName = 'Unknown';

  if (videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json() as { title?: string; author_name?: string };
        title = data.title || title;
        channelName = data.author_name || channelName;
      }
    } catch (e) {
      console.log('[Mobile] Could not fetch YouTube metadata:', e);
    }
  }

  const postId = generateId('post');
  const contextJson = JSON.stringify({
    videoId,
    title,
    channelName,
    url,
    savedFrom: 'ios_shortcut',
    savedAt: new Date().toISOString()
  });

  await c.env.DB.prepare(`
    INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    userId,
    'youtube_video',
    title,
    contextJson,
    'saved',
    Date.now()
  ).run();

  return c.json({
    success: true,
    message: '📹 Video saved!',
    type: 'youtube',
    id: postId,
    videoId,
    title,
    channelName
  });
}

/**
 * Save as memory/text
 */
async function saveAsMemory(c: any, userId: string, text: string) {
  const memoryId = generateId('mem');
  const contextJson = JSON.stringify({
    savedFrom: 'ios_shortcut',
    savedAt: new Date().toISOString()
  });

  await c.env.DB.prepare(`
    INSERT INTO memory (id, user_id, text, context_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    memoryId,
    userId,
    text,
    contextJson,
    Date.now()
  ).run();

  return c.json({
    success: true,
    message: '💾 Text saved!',
    type: 'memory',
    id: memoryId,
    preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
  });
}

/**
 * GET /api/mobile/health
 * Health check for mobile endpoints
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Mobile API ready',
    endpoints: [
      'POST /api/mobile/save - Universal save (auto-detects tweet/youtube/text)',
      'POST /api/mobile/save-text',
      'POST /api/mobile/save-tweet',
      'POST /api/mobile/save-youtube'
    ]
  });
});

/**
 * Ensure user exists in database
 */
async function ensureUserExists(c: any, userId: string) {
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!existing) {
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, subscription_tier)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      `${userId}@mobile.local`,
      'mobile',
      Date.now(),
      'free'
    ).run();
  }
}

export default router;
