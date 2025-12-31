/**
 * URL detection and enrichment utilities
 * Shared across webhook, mobile, memory, and admin routes
 */

import type { Env } from '../types';
import { generateEmbedding, extractKeywords, insertVector, EMBEDDING_MODEL } from './embeddings';

/**
 * Check if text is a URL (http/https pattern, max 500 chars)
 */
export function isUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\/[^\s]+$/.test(trimmed) && trimmed.length < 500;
}

/**
 * Detect URL type based on domain
 */
export function detectUrlType(url: string): 'youtube' | 'twitter' | 'webpage' {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return 'webpage';
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
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
 * Normalize URL - ensure it has protocol
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Async URL enrichment - fetches metadata and generates embeddings
 * Use with waitUntil() for background processing
 *
 * Features:
 * - YouTube: oEmbed metadata + transcript (if service available)
 * - Twitter: oEmbed metadata
 * - Webpages: title, description, og:image, article content extraction
 */
export async function enrichUrlMemory(
  env: Env,
  memoryId: string,
  url: string,
  urlType: string,
  userId: string = 'default_user'
): Promise<void> {
  console.log('[URL] Enriching memory:', memoryId, urlType);

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
            console.warn('[URL] Transcript fetch failed:', e);
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
          console.warn('[URL] YouTube oEmbed failed:', e);
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
        console.warn('[URL] Twitter oEmbed failed:', e);
      }
    } else {
      // Generic webpage extraction
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyMemoryBot/1.0)' },
          redirect: 'follow'
        });
        if (response.ok) {
          const html = await response.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1].trim() : '';

          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
          description = descMatch ? descMatch[1].trim() : '';

          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogImageMatch) thumbnailUrl = ogImageMatch[1];

          // Extract main content from article/main tags
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
        console.warn('[URL] Webpage fetch failed:', e);
      }
    }

    // Build context object
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

    // Generate embedding for enriched text
    let embedding: number[] | null = null;
    if (env.AI && combinedText !== url) {
      embedding = await generateEmbedding(env, combinedText);
    }

    // Update D1 with enriched content
    await env.DB.prepare(`
      UPDATE memory
      SET text = ?, context_json = ?, tag = ?, embedding_vector = ?, embedding_model = ?, search_keywords = ?
      WHERE id = ?
    `).bind(
      combinedText.substring(0, 10000),
      JSON.stringify(context),
      'link',
      embedding ? JSON.stringify(embedding) : null,
      embedding ? EMBEDDING_MODEL : null,
      embedding ? JSON.stringify(extractKeywords(combinedText)) : null,
      memoryId
    ).run();

    // Update Vectorize
    if (embedding && env.VECTORIZE) {
      await insertVector(env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: urlType
      });
    }

    console.log('[URL] Enriched:', memoryId, 'title:', title?.substring(0, 50), embedding ? '(with embedding)' : '');
  } catch (error) {
    console.error('[URL] Enrichment failed:', error);
  }
}
