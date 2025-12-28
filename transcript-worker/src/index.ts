/**
 * YouTube Transcript Worker
 * Uses Supadata API to fetch YouTube transcripts
 */

export interface Env {
  ENVIRONMENT: string;
  SUPADATA_API_KEY: string;
}

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

interface SupadataResponse {
  lang?: string;
  content?: Array<{
    text: string;
    offset: number;
    duration: number;
    lang?: string;
  }>;
  error?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Fetch transcript using Supadata API
async function getTranscript(videoId: string, preferredLang: string, apiKey: string) {
  const transcriptUrl = `https://api.supadata.ai/v1/transcript?url=https://youtu.be/${videoId}&lang=${preferredLang}`;

  const response = await fetch(transcriptUrl, {
    headers: {
      'x-api-key': apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `Supadata API error: ${response.status} - ${errorText}`,
      video_id: videoId
    };
  }

  const data = await response.json() as SupadataResponse;

  if (!data.content || data.content.length === 0) {
    return {
      success: false,
      error: 'No transcript available for this video',
      video_id: videoId
    };
  }

  const segments: TranscriptSegment[] = data.content.map(seg => ({
    text: seg.text,
    offset: seg.offset,
    duration: seg.duration
  }));

  const plainText = segments
    .map(s => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    success: true,
    video_id: videoId,
    language: data.lang || preferredLang,
    text: plainText,
    word_count: plainText.split(/\s+/).length,
    segment_count: segments.length,
    segments,
    source: 'supadata'
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Root
    if (path === '/') {
      return new Response(JSON.stringify({
        service: 'YouTube Transcript Worker',
        version: '2.0.0',
        endpoints: {
          transcript: '/transcript/{video_id}?lang=en',
          health: '/health'
        }
      }), { headers: corsHeaders });
    }

    // Health
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'healthy' }), { headers: corsHeaders });
    }

    // Transcript
    if (path.startsWith('/transcript/')) {
      const videoId = path.replace('/transcript/', '');
      const lang = url.searchParams.get('lang') || 'en';

      if (!videoId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing video_id'
        }), { status: 400, headers: corsHeaders });
      }

      if (!env.SUPADATA_API_KEY) {
        return new Response(JSON.stringify({
          success: false,
          error: 'SUPADATA_API_KEY not configured'
        }), { status: 500, headers: corsHeaders });
      }

      try {
        const result = await getTranscript(videoId, lang, env.SUPADATA_API_KEY);
        const status = result.success ? 200 : 404;
        return new Response(JSON.stringify(result), { status, headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500, headers: corsHeaders });
      }
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
  }
};
