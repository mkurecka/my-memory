/**
 * Media content extractor using vision AI models
 * Processes images and videos into searchable text content
 */

import type { Env } from '../types';

const VISION_MODEL = 'google/gemini-3.1-flash-lite-preview';

export interface MediaExtraction {
  text: string;           // All extracted/visible text (OCR)
  description: string;    // What the media shows
  topics: string[];       // Key concepts/topics detected
  data: string[];         // Any numbers, metrics, data points
  mediaType: 'screenshot' | 'diagram' | 'photo' | 'chart' | 'code' | 'video' | 'other';
}

const EXTRACTION_PROMPT = `Analyze this image thoroughly and extract ALL information. Return a JSON object with these fields:

{
  "text": "All visible text in the image, transcribed exactly as shown. Include ALL text, labels, captions, UI elements, code, etc. If no text visible, return empty string.",
  "description": "Detailed description of what the image shows - layout, elements, purpose, context. Be specific.",
  "topics": ["topic1", "topic2", "topic3"],
  "data": ["any numbers, metrics, statistics, or data points visible"],
  "mediaType": "screenshot|diagram|photo|chart|code|other"
}

Rules:
- For screenshots: focus on extracting ALL text, UI elements, button labels
- For diagrams/whiteboards: describe the structure, relationships, flow direction
- For code: extract the code with proper formatting, note the language
- For charts/graphs: extract axis labels, values, trends, data points
- For photos: describe the scene, identify objects, read any text
- Always return valid JSON. No markdown, no explanation, just the JSON object.`;

export async function extractFromImage(url: string, env: Env): Promise<MediaExtraction | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.APP_URL || 'https://memory.michalkurecka.cz',
        'X-Title': 'My Memory - Media Extractor',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url } }
          ]
        }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MediaExtractor] OpenRouter error:', error);
      return null;
    }

    const result = await response.json() as any;
    const content = result.choices?.[0]?.message?.content || '';

    try {
      // Try parsing as JSON directly
      const parsed = JSON.parse(content);
      return {
        text: parsed.text || '',
        description: parsed.description || '',
        topics: parsed.topics || [],
        data: parsed.data || [],
        mediaType: parsed.mediaType || 'other',
      };
    } catch {
      // If JSON parsing fails, try extracting JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        return {
          text: parsed.text || '',
          description: parsed.description || '',
          topics: parsed.topics || [],
          data: parsed.data || [],
          mediaType: parsed.mediaType || 'other',
        };
      }
      // Last resort: return raw content as description
      console.error('[MediaExtractor] Failed to parse JSON response, using raw text');
      return {
        text: '',
        description: content,
        topics: [],
        data: [],
        mediaType: 'other',
      };
    }
  } catch (error: any) {
    console.error('[MediaExtractor] extractFromImage error:', error.message);
    return null;
  }
}

export async function extractFromVideo(url: string, env: Env): Promise<MediaExtraction | null> {
  // Check if YouTube URL
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);

  if (ytMatch) {
    // Use transcript service for YouTube
    try {
      const transcriptUrl = typeof env.TRANSCRIPT_SERVICE === 'string'
        ? env.TRANSCRIPT_SERVICE
        : null;

      if (transcriptUrl) {
        const response = await fetch(`${transcriptUrl}/transcript?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json() as any;
          return {
            text: data.transcript || '',
            description: `YouTube video: ${data.title || 'Unknown'} by ${data.author || 'Unknown'}`,
            topics: [],
            data: data.duration ? [`Duration: ${data.duration}`] : [],
            mediaType: 'video',
          };
        }
      }
    } catch (err) {
      console.error('[MediaExtractor] YouTube transcript failed:', err);
    }
  }

  // For non-YouTube videos or if transcript fails, try vision model with thumbnail
  // Most vision models can't process video directly, so we describe what we know
  return {
    text: '',
    description: `Video URL: ${url}`,
    topics: [],
    data: [],
    mediaType: 'video',
  };
}
