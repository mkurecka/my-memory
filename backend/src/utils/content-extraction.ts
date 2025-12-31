import { extractYouTubeVideoId } from './url';

/**
 * Content extraction return type
 */
export interface ExtractedContent {
  title?: string;
  description?: string;
  text: string;
  transcript?: string;
  author?: string;
  thumbnailUrl?: string;
  duration?: string;
  metadata?: Record<string, any>;
}

/**
 * Extract content from YouTube video
 */
export async function extractYouTubeContent(env: any, url: string): Promise<ExtractedContent | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    // Use our transcript service to get video info + transcript
    const transcriptService = env.TRANSCRIPT_SERVICE;
    if (!transcriptService) {
      console.warn('[ContentExtraction] TRANSCRIPT_SERVICE not available');
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
      console.warn('[ContentExtraction] oEmbed fetch failed:', e);
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
    console.error('[ContentExtraction] YouTube extraction error:', error);
    return { text: url, metadata: { videoId } };
  }
}

/**
 * Extract content from Twitter/X URL
 * Note: Limited without API access, just stores URL and oEmbed info
 */
export async function extractTwitterContent(url: string): Promise<ExtractedContent | null> {
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
    console.warn('[ContentExtraction] Twitter oEmbed failed:', e);
  }

  // Fallback: just return URL
  return { text: url, metadata: { url } };
}

/**
 * Extract content from generic webpage using fetch
 */
export async function extractWebpageContent(url: string): Promise<ExtractedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyMemoryBot/1.0)'
      }
    });

    if (!response.ok) {
      console.warn('[ContentExtraction] Webpage fetch failed:', response.status);
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
    console.error('[ContentExtraction] Webpage extraction error:', error);
    return null;
  }
}
