import { Hono } from 'hono';
import type { Env, Memory } from '../types';
import { generateId } from '../utils/id';
import { deleteVector, generateEmbedding, insertVector, EMBEDDING_MODEL } from '../utils/embeddings';
import { detectUrlType } from '../utils/url';
import { createAuthMiddleware } from '../utils/auth-middleware';
import { simpleHash } from '../utils/helpers';
import { extractYouTubeContent, extractTwitterContent, extractWebpageContent } from '../utils/content-extraction';
import { analyzeMemory, type MemoryAnalysis } from '../utils/memory-analyzer';

const memory = new Hono<{ Bindings: Env }>();
const authMiddleware = createAuthMiddleware();

// POST /api/memory - Create memory (auto-enriches URLs)
memory.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { text, context, tag, priority = 'medium', skipDuplicateCheck = false } = await c.req.json();

    if (!text) {
      return c.json({
        success: false,
        error: 'Text is required',
      }, 400);
    }

    // Check for duplicates (by exact text match for URLs, or hash for longer content)
    if (!skipDuplicateCheck) {
      const trimmedText = text.trim();
      const isUrl = /^https?:\/\/[^\s]+$/.test(trimmedText);

      if (isUrl) {
        // For URLs, check exact match
        const existing = await c.env.DB.prepare(
          'SELECT id FROM memory WHERE user_id = ? AND text = ? LIMIT 1'
        ).bind(userId, trimmedText).first();

        if (existing) {
          console.log('[Memory] Duplicate URL detected:', trimmedText);
          return c.json({
            success: false,
            error: 'This URL is already saved',
            existingId: existing.id,
            duplicate: true
          }, 409);
        }
      } else if (text.length > 50) {
        // For longer text, check by hash (stored in context_json)
        const textHash = simpleHash(text);
        const existing = await c.env.DB.prepare(
          "SELECT id FROM memory WHERE user_id = ? AND context_json LIKE ? LIMIT 1"
        ).bind(userId, `%"textHash":"${textHash}"%`).first();

        if (existing) {
          console.log('[Memory] Duplicate content detected (hash match)');
          return c.json({
            success: false,
            error: 'Similar content already saved',
            existingId: existing.id,
            duplicate: true
          }, 409);
        }

        // Add hash to context for future deduplication
        context.textHash = textHash;
      }
    }

    const memoryId = generateId();
    const now = Date.now();

    // Check if text is a URL-only string - auto-enrich if so
    const trimmedText = text.trim();
    const urlPattern = /^https?:\/\/[^\s]+$/;
    const isUrl = urlPattern.test(trimmedText);

    let finalText = text;
    let finalContext = context || {};
    let finalTag = tag;
    let urlType: 'youtube' | 'twitter' | 'webpage' | null = null;

    if (isUrl) {
      const url = trimmedText;
      urlType = detectUrlType(url);
      console.log('[Memory] Auto-enriching URL:', url, 'type:', urlType);

      let extractedContent: {
        title?: string;
        description?: string;
        text: string;
        transcript?: string;
        author?: string;
        thumbnailUrl?: string;
        duration?: string;
        metadata?: Record<string, any>;
      } | null = null;

      // Extract content based on URL type
      if (urlType === 'youtube') {
        extractedContent = await extractYouTubeContent(c.env, url);
      } else if (urlType === 'twitter') {
        extractedContent = await extractTwitterContent(url);
      } else {
        extractedContent = await extractWebpageContent(url);
      }

      if (extractedContent && extractedContent.text !== url) {
        // Build combined text for embedding
        finalText = [
          extractedContent.title,
          extractedContent.description,
          extractedContent.transcript || extractedContent.text
        ].filter(Boolean).join(' ').substring(0, 10000);

        // Merge context with extracted data
        finalContext = {
          ...finalContext,
          url,
          type: urlType,
          title: extractedContent.title,
          description: extractedContent.description,
          author: extractedContent.author,
          thumbnailUrl: extractedContent.thumbnailUrl,
          duration: extractedContent.duration,
          hasTranscript: !!extractedContent.transcript,
          ...extractedContent.metadata
        };

        // Use URL type as default tag if not provided
        if (!finalTag) {
          finalTag = urlType;
        }

        console.log('[Memory] URL enriched - title:', extractedContent.title?.substring(0, 50));
      } else {
        // Extraction failed, save URL as-is with type info
        finalContext = { ...finalContext, url, type: urlType };
        if (!finalTag) finalTag = urlType;
        console.log('[Memory] URL extraction failed, saving as-is');
      }
    }

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    if (c.env.AI) {
      embedding = await generateEmbedding(c.env, finalText);
    }

    await c.env.DB
      .prepare(`
        INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, embedding_model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        memoryId,
        userId,
        finalText,
        Object.keys(finalContext).length > 0 ? JSON.stringify(finalContext) : null,
        finalTag || null,
        priority,
        embedding ? JSON.stringify(embedding) : null,
        embedding ? EMBEDDING_MODEL : null,
        now
      )
      .run();

    // Insert into Vectorize for semantic search
    if (embedding && c.env.VECTORIZE) {
      await insertVector(c.env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: urlType || 'memory'
      });
      console.log('[Memory] Created with embedding:', memoryId);
    }

    // Trigger AI analysis in background (non-blocking)
    c.executionCtx.waitUntil(
      analyzeMemoryAndUpdate(c.env, memoryId, finalText, finalContext)
    );

    return c.json({
      success: true,
      memoryId,
      message: isUrl ? `${urlType} content saved successfully` : 'Memory saved successfully',
      ...(isUrl && { type: urlType, enriched: finalText !== text })
    }, 201);
  } catch (error: any) {
    console.error('Create memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to create memory',
    }, 500);
  }
});

// GET /api/memory - List memories
memory.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { tag, priority, limit = '50', offset = '0' } = c.req.query();

    let query = 'SELECT * FROM memory WHERE user_id = ?';
    const bindings: any[] = [userId];

    if (tag) {
      query += ' AND tag = ?';
      bindings.push(tag);
    }

    if (priority) {
      query += ' AND priority = ?';
      bindings.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(parseInt(limit), parseInt(offset));

    const result = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all<Memory>();

    return c.json({
      success: true,
      memories: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('List memories error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to list memories',
    }, 500);
  }
});

// GET /api/memory/:id - Get single memory
// Public endpoint for dashboard
memory.get('/:id', async (c) => {
  try {
    const memoryId = c.req.param('id');

    const memoryItem = await c.env.DB
      .prepare('SELECT * FROM memory WHERE id = ?')
      .bind(memoryId)
      .first<Memory>();

    if (!memoryItem) {
      return c.json({
        success: false,
        error: 'Memory not found',
      }, 404);
    }

    return c.json({
      success: true,
      memory: memoryItem,
    });
  } catch (error: any) {
    console.error('Get memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get memory',
    }, 500);
  }
});

// PATCH /api/memory/:id - Update memory
memory.patch('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');
    const { text, tag, priority } = await c.req.json();

    // Verify memory belongs to user
    const existing = await c.env.DB
      .prepare('SELECT id FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'Memory not found',
      }, 404);
    }

    const updates: string[] = [];
    const bindings: any[] = [];

    if (text) {
      updates.push('text = ?');
      bindings.push(text);
    }

    if (tag !== undefined) {
      updates.push('tag = ?');
      bindings.push(tag);
    }

    if (priority) {
      updates.push('priority = ?');
      bindings.push(priority);
    }

    if (updates.length === 0) {
      return c.json({
        success: false,
        error: 'No fields to update',
      }, 400);
    }

    bindings.push(memoryId, userId);

    await c.env.DB
      .prepare(`UPDATE memory SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...bindings)
      .run();

    // If text was updated, regenerate embedding and update Vectorize
    if (text && c.env.VECTORIZE) {
      const embedding = await generateEmbedding(c.env, text);
      if (embedding) {
        // Update D1 with new embedding
        await c.env.DB.prepare(
          'UPDATE memory SET embedding_vector = ?, embedding_model = ? WHERE id = ?'
        ).bind(JSON.stringify(embedding), EMBEDDING_MODEL, memoryId).run();

        // Update Vectorize (upsert replaces existing vector)
        await insertVector(c.env, memoryId, embedding, {
          user_id: userId,
          table: 'memory',
          type: 'memory'
        });
        console.log('[Memory] Updated embedding for:', memoryId);
      } else {
        console.warn('[Memory] Failed to regenerate embedding for:', memoryId);
      }
    }

    return c.json({
      success: true,
      message: 'Memory updated successfully',
    });
  } catch (error: any) {
    console.error('Update memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update memory',
    }, 500);
  }
});

// DELETE /api/memory/:id - Delete memory
memory.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: 'Memory not found',
      }, 404);
    }

    // Also remove from Vectorize index
    if (c.env.VECTORIZE) {
      const vectorDeleted = await deleteVector(c.env, memoryId);
      if (!vectorDeleted) {
        console.warn('[Memory] Failed to delete vector for:', memoryId);
        // Don't fail the request - D1 deletion was successful
      }
    }

    return c.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete memory error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to delete memory',
    }, 500);
  }
});

// POST /api/memory/:id/enrich - Re-process existing memory to extract URL content
memory.post('/:id/enrich', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    // Fetch the existing memory
    const existing = await c.env.DB
      .prepare('SELECT id, text, context_json FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .first<{ id: string; text: string; context_json: string | null }>();

    if (!existing) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    // Check if text looks like a URL
    const text = existing.text.trim();
    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (!urlPattern.test(text)) {
      return c.json({
        success: false,
        error: 'Memory text is not a URL. Only URL-only memories can be enriched.'
      }, 400);
    }

    const url = text;
    const urlType = detectUrlType(url);
    console.log('[Memory] Enriching:', memoryId, 'URL:', url, 'type:', urlType);

    let extractedContent: {
      title?: string;
      description?: string;
      text: string;
      transcript?: string;
      author?: string;
      thumbnailUrl?: string;
      duration?: string;
      metadata?: Record<string, any>;
    } | null = null;

    // Extract content based on URL type
    if (urlType === 'youtube') {
      extractedContent = await extractYouTubeContent(c.env, url);
    } else if (urlType === 'twitter') {
      extractedContent = await extractTwitterContent(url);
    } else {
      // Generic webpage - try to fetch and extract
      extractedContent = await extractWebpageContent(url);
    }

    if (!extractedContent || extractedContent.text === url) {
      return c.json({
        success: false,
        error: 'Could not extract content from URL'
      }, 400);
    }

    // Build combined text for embedding
    const combinedText = [
      extractedContent.title,
      extractedContent.description,
      extractedContent.transcript || extractedContent.text
    ].filter(Boolean).join(' ');

    // Generate new embedding
    let embedding: number[] | null = null;
    if (c.env.AI && combinedText) {
      embedding = await generateEmbedding(c.env, combinedText);
    }

    // Merge with existing context
    let existingContext: Record<string, any> = {};
    try {
      existingContext = existing.context_json ? JSON.parse(existing.context_json) : {};
    } catch { /* ignore */ }

    const newContext = {
      ...existingContext,
      url,
      type: urlType,
      title: extractedContent.title,
      description: extractedContent.description,
      author: extractedContent.author,
      thumbnailUrl: extractedContent.thumbnailUrl,
      duration: extractedContent.duration,
      hasTranscript: !!extractedContent.transcript,
      enrichedAt: new Date().toISOString(),
      ...extractedContent.metadata
    };

    // Update D1
    await c.env.DB
      .prepare(`
        UPDATE memory
        SET text = ?, context_json = ?, tag = COALESCE(tag, ?),
            embedding_vector = ?, embedding_model = ?
        WHERE id = ?
      `)
      .bind(
        combinedText.substring(0, 10000),
        JSON.stringify(newContext),
        urlType,
        embedding ? JSON.stringify(embedding) : null,
        embedding ? EMBEDDING_MODEL : null,
        memoryId
      )
      .run();

    // Update Vectorize
    if (embedding && c.env.VECTORIZE) {
      await insertVector(c.env, memoryId, embedding, {
        user_id: userId,
        table: 'memory',
        type: urlType
      });
    }

    console.log('[Memory] Enriched:', memoryId, 'type:', urlType, embedding ? '(with embedding)' : '');

    return c.json({
      success: true,
      memoryId,
      type: urlType,
      title: extractedContent.title,
      hasTranscript: !!extractedContent.transcript,
      textLength: combinedText.length,
      message: `Memory enriched with ${urlType} content`
    });

  } catch (error: any) {
    console.error('[Memory] enrich error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to enrich memory'
    }, 500);
  }
});

// GET /api/memory/tags/list - List all unique tags
memory.get('/tags/list', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const result = await c.env.DB
      .prepare('SELECT DISTINCT tag FROM memory WHERE user_id = ? AND tag IS NOT NULL ORDER BY tag')
      .bind(userId)
      .all<{ tag: string }>();

    return c.json({
      success: true,
      tags: result.results?.map(r => r.tag) || [],
    });
  } catch (error: any) {
    console.error('List tags error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to list tags',
    }, 500);
  }
});

// POST /api/memory/:id/analyze - Analyze a specific memory with AI
memory.post('/:id/analyze', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    const existing = await c.env.DB
      .prepare('SELECT id, text, context_json FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
      .first<{ id: string; text: string; context_json: string | null }>();

    if (!existing) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    let context: Record<string, any> = {};
    try {
      context = existing.context_json ? JSON.parse(existing.context_json) : {};
    } catch { /* ignore */ }

    const analysis = await analyzeMemory(c.env, existing.text, context);

    if (!analysis) {
      return c.json({
        success: false,
        error: 'Failed to analyze memory. Check OpenRouter API key.'
      }, 500);
    }

    // Update context with analysis
    context.analysis = analysis;

    await c.env.DB
      .prepare('UPDATE memory SET context_json = ? WHERE id = ?')
      .bind(JSON.stringify(context), memoryId)
      .run();

    return c.json({
      success: true,
      memoryId,
      analysis
    });
  } catch (error: any) {
    console.error('[Memory] analyze error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/memory/insights - Get aggregated insights from analyzed content (memories + posts)
// Public endpoint for dashboard (no auth required)
memory.get('/insights/overview', async (c) => {
  try {
    // Fetch all memories with analysis
    const memoriesResult = await c.env.DB
      .prepare(`
        SELECT id, text, context_json, tag, created_at, 'memory' as source_type
        FROM memory
        WHERE context_json LIKE '%"analysis":%'
        ORDER BY created_at DESC
      `)
      .all<{ id: string; text: string; context_json: string; tag: string; created_at: number; source_type: string }>();

    // Fetch all posts (tweets, videos) with analysis
    const postsResult = await c.env.DB
      .prepare(`
        SELECT id, original_text as text, context_json, type as tag, created_at, 'post' as source_type
        FROM posts
        WHERE context_json LIKE '%"analysis":%'
        ORDER BY created_at DESC
      `)
      .all<{ id: string; text: string; context_json: string; tag: string; created_at: number; source_type: string }>();

    // Combine both
    const memories = [...(memoriesResult.results || []), ...(postsResult.results || [])];

    // Aggregate insights
    const insights = {
      totalAnalyzed: memories.length,
      byCategory: {} as Record<string, number>,
      byActionPriority: { high: 0, medium: 0, low: 0 },
      topActions: {} as Record<string, number>,
      topTopics: {} as Record<string, number>,
      contentPotential: {
        twitter: [] as any[],
        linkedin: [] as any[],
        instagram: [] as any[],
        youtube: [] as any[],
        tiktok: [] as any[],
        article: [] as any[]
      },
      businessIdeas: [] as any[],
      actionableItems: [] as any[]
    };

    for (const mem of memories) {
      try {
        const context = JSON.parse(mem.context_json);
        const analysis = context.analysis as MemoryAnalysis;
        if (!analysis) continue;

        // Count categories
        insights.byCategory[analysis.category] = (insights.byCategory[analysis.category] || 0) + 1;

        // Count priority
        if (analysis.actionPriority) {
          insights.byActionPriority[analysis.actionPriority]++;
        }

        // Count topics
        for (const topic of analysis.topics || []) {
          insights.topTopics[topic] = (insights.topTopics[topic] || 0) + 1;
        }

        // Count actions
        for (const action of analysis.suggestedActions || []) {
          insights.topActions[action.type] = (insights.topActions[action.type] || 0) + 1;
        }

        // Collect high-potential content
        const memSummary = {
          id: mem.id,
          title: context.title || mem.text.substring(0, 80),
          sourceType: (mem as any).source_type || 'memory',
          tag: mem.tag,
          analysis: analysis
        };

        if (analysis.contentPotential?.twitter?.score >= 70) {
          insights.contentPotential.twitter.push(memSummary);
        }
        if (analysis.contentPotential?.linkedin?.score >= 70) {
          insights.contentPotential.linkedin.push(memSummary);
        }
        if (analysis.contentPotential?.instagram?.score >= 70) {
          insights.contentPotential.instagram.push(memSummary);
        }
        if (analysis.contentPotential?.youtube?.score >= 70) {
          insights.contentPotential.youtube.push(memSummary);
        }
        if (analysis.contentPotential?.tiktok?.score >= 70) {
          insights.contentPotential.tiktok.push(memSummary);
        }
        if (analysis.contentPotential?.article?.score >= 70) {
          insights.contentPotential.article.push(memSummary);
        }

        // Collect business ideas
        if (analysis.businessRelevance?.score >= 70) {
          insights.businessIdeas.push(memSummary);
        }

        // High priority actionable items
        if (analysis.actionPriority === 'high') {
          insights.actionableItems.push(memSummary);
        }

      } catch { /* skip invalid */ }
    }

    // Sort content potential by score
    for (const platform of Object.keys(insights.contentPotential) as Array<keyof typeof insights.contentPotential>) {
      insights.contentPotential[platform].sort((a, b) =>
        (b.analysis.contentPotential?.[platform]?.score || 0) -
        (a.analysis.contentPotential?.[platform]?.score || 0)
      );
      insights.contentPotential[platform] = insights.contentPotential[platform].slice(0, 10);
    }

    // Sort topics and actions
    const sortedTopics = Object.entries(insights.topTopics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);
    const sortedActions = Object.entries(insights.topActions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);

    return c.json({
      success: true,
      insights: {
        ...insights,
        topTopics: Object.fromEntries(sortedTopics),
        topActions: Object.fromEntries(sortedActions),
        businessIdeas: insights.businessIdeas.slice(0, 10),
        actionableItems: insights.actionableItems.slice(0, 20)
      }
    });
  } catch (error: any) {
    console.error('[Memory] insights error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/memory/insights/item/:id - Get individual item details (public endpoint for insights modal)
memory.get('/insights/item/:id', async (c) => {
  try {
    const { id } = c.req.param();

    // Try to find in memory table first
    let item = await c.env.DB.prepare(`
      SELECT id, text, context_json, tag, created_at, 'memory' as source_type
      FROM memory
      WHERE id = ?
    `).bind(id).first<{ id: string; text: string; context_json: string; tag: string; created_at: number; source_type: string }>();

    // If not found, try posts table
    if (!item) {
      item = await c.env.DB.prepare(`
        SELECT id, original_text as text, context_json, type as tag, created_at, 'post' as source_type
        FROM posts
        WHERE id = ?
      `).bind(id).first();
    }

    if (!item) {
      return c.json({ success: false, error: 'Item not found' }, 404);
    }

    let context = {};
    let analysis = {};
    try {
      context = JSON.parse(item.context_json || '{}');
      analysis = (context as any).analysis || {};
    } catch { /* ignore parse error */ }

    return c.json({
      success: true,
      item: {
        id: item.id,
        text: item.text,
        analysis: analysis,
        context: {
          ...(context as object),
          title: (context as any).title || (context as any).extractedTitle || item.text?.substring(0, 100),
          type: item.tag
        },
        sourceType: item.source_type,
        tag: item.tag,
        createdAt: item.created_at
      }
    });
  } catch (error: any) {
    console.error('[Memory] insights/item error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/memory/insights/by-action/:action - Get memories by suggested action type
// Public endpoint for dashboard
memory.get('/insights/by-action/:action', async (c) => {
  try {
    const actionType = c.req.param('action');

    const result = await c.env.DB
      .prepare(`
        SELECT id, text, context_json, tag, created_at
        FROM memory
        WHERE context_json LIKE ?
        ORDER BY created_at DESC
      `)
      .bind(`%"type":"${actionType}"%`)
      .all<{ id: string; text: string; context_json: string; tag: string; created_at: number }>();

    const memories = (result.results || []).map(mem => {
      let context: any = {};
      try { context = JSON.parse(mem.context_json); } catch { /* ignore */ }
      return {
        id: mem.id,
        title: context.title || mem.text.substring(0, 100),
        text: mem.text.substring(0, 300),
        tag: mem.tag,
        createdAt: mem.created_at,
        analysis: context.analysis
      };
    }).filter(m => {
      // Verify the action type is in suggestedActions
      return m.analysis?.suggestedActions?.some((a: any) => a.type === actionType);
    });

    return c.json({
      success: true,
      action: actionType,
      count: memories.length,
      memories
    });
  } catch (error: any) {
    console.error('[Memory] by-action error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Helper: Analyze memory and update context_json
 */
async function analyzeMemoryAndUpdate(
  env: Env,
  memoryId: string,
  text: string,
  context: Record<string, any>
): Promise<void> {
  try {
    console.log('[Memory] Starting background analysis for:', memoryId);

    const analysis = await analyzeMemory(env, text, context);

    if (analysis) {
      // Merge analysis into context
      const updatedContext = { ...context, analysis };

      await env.DB
        .prepare('UPDATE memory SET context_json = ? WHERE id = ?')
        .bind(JSON.stringify(updatedContext), memoryId)
        .run();

      console.log('[Memory] Analysis saved for:', memoryId, 'category:', analysis.category);
    } else {
      console.log('[Memory] No analysis generated for:', memoryId);
    }
  } catch (error: any) {
    console.error('[Memory] Background analysis error:', error.message);
  }
}

export default memory;
