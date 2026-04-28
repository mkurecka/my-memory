import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';
import { ensureUserExists, simpleHash } from '../utils/helpers';
import { detectUrlType } from '../utils/url';
import { extractTwitterContent, extractWebpageContent, extractYouTubeContent } from '../utils/content-extraction';
import { EMBEDDING_MODEL, generateEmbedding, insertVector } from '../utils/embeddings';

type SourceType = 'text' | 'url' | 'image' | 'audio' | 'video' | 'telegram' | 'tweet' | 'youtube' | 'file' | 'screenshot';

interface IngestRequest {
  sourceType?: SourceType;
  content?: string;
  text?: string;
  url?: string;
  title?: string;
  note?: string;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
  tags?: string[];
  tag?: string;
  priority?: 'low' | 'medium' | 'high';
  userId?: string;
  skipDuplicateCheck?: boolean;
}

const ingest = new Hono<{ Bindings: Env }>();

ingest.post('/', async (c) => {
  try {
    const body = await c.req.json<IngestRequest>();
    const userId = body.userId || c.req.header('X-User-Id') || 'michal_main_user';
    const sourceType = normalizeSourceType(body);
    const originalText = (body.content || body.text || body.url || '').trim();

    if (!originalText && !body.url) {
      return c.json({ success: false, error: 'content, text, or url is required' }, 400);
    }

    await ensureUserExists(c, userId);

    if (!body.skipDuplicateCheck) {
      const duplicate = await findDuplicate(c.env, userId, originalText || body.url || '');
      if (duplicate) {
        return c.json({
          success: false,
          error: 'This memory is already saved',
          duplicate: true,
          existingId: duplicate.id,
        }, 409);
      }
    }

    const normalized = await normalizeForMemory(c.env, {
      ...body,
      sourceType,
      content: originalText,
    });

    const memoryId = generateId();
    const now = Date.now();
    const context = {
      ...(body.context || {}),
      ...(body.metadata || {}),
      ...(normalized.context || {}),
      sourceType,
      ingestedAt: new Date(now).toISOString(),
      textHash: simpleHash(normalized.text),
    };

    const tag = body.tag || body.tags?.[0] || sourceType;
    const priority = body.priority || 'medium';
    const text = normalized.text.substring(0, 10000);

    let embedding: number[] | null = null;
    if (c.env.AI) {
      embedding = await generateEmbedding(c.env, text);
    }

    await c.env.DB.prepare(`
      INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, embedding_model, search_keywords, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      memoryId,
      userId,
      text,
      JSON.stringify(context),
      tag,
      priority,
      embedding ? JSON.stringify(embedding) : null,
      embedding ? EMBEDDING_MODEL : null,
      buildSearchKeywords(text, context),
      now
    ).run();

    if (embedding && c.env.VECTORIZE) {
      await insertVector(c.env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: sourceType,
      });
    }

    return c.json({
      success: true,
      memoryId,
      sourceType,
      tag,
      enriched: normalized.enriched,
      message: 'Memory ingested successfully',
    }, 201);
  } catch (error: any) {
    console.error('[Ingest] error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to ingest memory',
    }, 500);
  }
});

function normalizeSourceType(body: IngestRequest): SourceType {
  if (body.sourceType) return body.sourceType;
  const value = (body.url || body.content || body.text || '').trim();
  if (/^https?:\/\/[^\s]+$/.test(value)) {
    const urlType = detectUrlType(value);
    if (urlType === 'youtube') return 'youtube';
    if (urlType === 'twitter') return 'tweet';
    return 'url';
  }
  return 'text';
}

async function findDuplicate(env: Env, userId: string, text: string): Promise<{ id: string } | null> {
  if (!text) return null;

  if (/^https?:\/\/[^\s]+$/.test(text)) {
    return await env.DB.prepare(
      "SELECT id FROM memory WHERE user_id = ? AND (text = ? OR context_json LIKE ?) LIMIT 1"
    ).bind(userId, text, `%"url":"${text}"%`).first<{ id: string }>();
  }

  if (text.length > 50) {
    const textHash = simpleHash(text);
    return await env.DB.prepare(
      "SELECT id FROM memory WHERE user_id = ? AND context_json LIKE ? LIMIT 1"
    ).bind(userId, `%"textHash":"${textHash}"%`).first<{ id: string }>();
  }

  return null;
}

async function normalizeForMemory(env: Env, body: IngestRequest & { sourceType: SourceType; content: string }) {
  const url = body.url || (/^https?:\/\/[^\s]+$/.test(body.content) ? body.content : undefined);
  const context: Record<string, any> = {};
  let text = body.content;
  let enriched = false;

  if (body.title) context.title = body.title;
  if (body.note) context.user_note = body.note;
  if (url) context.url = url;

  if (url && ['url', 'tweet', 'youtube'].includes(body.sourceType)) {
    const urlType = detectUrlType(url);
    const extracted = urlType === 'youtube'
      ? await extractYouTubeContent(env, url)
      : urlType === 'twitter'
        ? await extractTwitterContent(url)
        : await extractWebpageContent(url);

    if (extracted && extracted.text !== url) {
      text = [
        extracted.title,
        extracted.description,
        extracted.transcript || extracted.text,
        body.note ? `Note: ${body.note}` : null,
      ].filter(Boolean).join('\n\n');

      Object.assign(context, {
        type: urlType,
        title: extracted.title,
        description: extracted.description,
        author: extracted.author,
        thumbnailUrl: extracted.thumbnailUrl,
        duration: extracted.duration,
        hasTranscript: !!extracted.transcript,
        ...extracted.metadata,
      });
      enriched = true;
    } else {
      context.type = urlType;
    }
  }

  return { text, context, enriched };
}

function buildSearchKeywords(text: string, context: Record<string, any>): string {
  const parts = [
    context.title,
    context.author,
    context.sourceType,
    context.type,
    text.slice(0, 500),
  ].filter(Boolean);

  return parts.join(' ').toLowerCase();
}

export default ingest;
