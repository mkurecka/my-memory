import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';
import { generateEmbedding, vectorSearch } from '../utils/embeddings';

const router = new Hono<{ Bindings: Env }>();

interface ChatRequest {
  message: string;
  conversationId?: string;
  userId?: string;
  model?: string;
  includeMemories?: boolean;
  includePosts?: boolean;
  topK?: number;
  minSimilarity?: number;
}

interface Source {
  id: string;
  type: string;
  text: string;
  similarity: number;
  created_at: number;
}

/**
 * POST /api/chat
 * RAG-powered chat endpoint that searches memories and posts for context
 */
router.post('/', async (c) => {
  try {
    const body: ChatRequest = await c.req.json();
    const {
      message,
      conversationId,
      userId = 'default_user',
      model = 'anthropic/claude-3.5-sonnet',
      includeMemories = true,
      includePosts = true,
      topK = 5,
      minSimilarity = 0.6
    } = body;

    if (!message || message.trim().length === 0) {
      return c.json({ success: false, error: 'Message is required' }, 400);
    }

    // Generate embedding for the user's message
    const queryEmbedding = await generateEmbedding(c.env, message);
    if (!queryEmbedding) {
      return c.json({ success: false, error: 'Failed to generate query embedding' }, 500);
    }

    // Search for relevant context from Vectorize
    const sources: Source[] = [];

    if (c.env.VECTORIZE) {
      // Search memories
      if (includeMemories) {
        const memoryResults = await vectorSearch(c.env, queryEmbedding, userId, {
          topK,
          minScore: minSimilarity,
          table: 'memory'
        });

        if (memoryResults.length > 0) {
          const memIds = memoryResults.map(r => r.id);
          const placeholders = memIds.map(() => '?').join(',');
          const memData = await c.env.DB.prepare(
            `SELECT id, text, created_at FROM memory WHERE id IN (${placeholders})`
          ).bind(...memIds).all();

          const memMap = new Map((memData.results || []).map((r: any) => [r.id, r]));
          for (const vr of memoryResults) {
            const mem = memMap.get(vr.id) as any;
            if (mem) {
              sources.push({
                id: mem.id,
                type: 'memory',
                text: mem.text,
                similarity: vr.score,
                created_at: mem.created_at
              });
            }
          }
        }
      }

      // Search posts
      if (includePosts) {
        const postResults = await vectorSearch(c.env, queryEmbedding, userId, {
          topK,
          minScore: minSimilarity,
          table: 'posts'
        });

        if (postResults.length > 0) {
          const postIds = postResults.map(r => r.id);
          const placeholders = postIds.map(() => '?').join(',');
          const postData = await c.env.DB.prepare(
            `SELECT id, type, original_text, generated_output, created_at FROM posts WHERE id IN (${placeholders})`
          ).bind(...postIds).all();

          const postMap = new Map((postData.results || []).map((r: any) => [r.id, r]));
          for (const vr of postResults) {
            const post = postMap.get(vr.id) as any;
            if (post) {
              sources.push({
                id: post.id,
                type: post.type || 'post',
                text: post.generated_output || post.original_text,
                similarity: vr.score,
                created_at: post.created_at
              });
            }
          }
        }
      }
    }

    // Sort sources by similarity and take top results
    sources.sort((a, b) => b.similarity - a.similarity);
    const topSources = sources.slice(0, topK);

    // Build RAG context
    let contextText = '';
    if (topSources.length > 0) {
      contextText = 'Here is relevant context from the user\'s saved memories:\n\n';
      for (let i = 0; i < topSources.length; i++) {
        const src = topSources[i];
        const date = new Date(src.created_at).toISOString().split('T')[0];
        contextText += `[${i + 1}] (${src.type}, ${date}): ${src.text.substring(0, 500)}${src.text.length > 500 ? '...' : ''}\n\n`;
      }
    }

    // Build the RAG prompt
    const systemPrompt = `You are a helpful AI assistant with access to the user's personal knowledge base.
Use the provided context to answer questions accurately and helpfully.
When referencing information from the context, cite the source number in brackets like [1], [2], etc.
If the context doesn't contain relevant information, say so and provide a general response.
Be conversational and helpful.`;

    const userPrompt = contextText
      ? `${contextText}\n---\nUser question: ${message}`
      : message;

    // Get conversation history if continuing a conversation
    let conversationHistory: { role: string; content: string }[] = [];
    let currentConversationId = conversationId;

    if (currentConversationId) {
      const messages = await c.env.DB.prepare(
        `SELECT role, content FROM chat_messages
         WHERE conversation_id = ?
         ORDER BY message_index ASC
         LIMIT 20`
      ).bind(currentConversationId).all();

      conversationHistory = (messages.results || []).map((m: any) => ({
        role: m.role,
        content: m.content
      }));
    } else {
      // Create new conversation
      currentConversationId = generateId('conv');
      await c.env.DB.prepare(
        `INSERT INTO chat_conversations (id, user_id, status, created_at, updated_at)
         VALUES (?, ?, 'active', ?, ?)`
      ).bind(currentConversationId, userId, Date.now(), Date.now()).run();
    }

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': c.env.APP_URL || 'https://my-memory.app',
        'X-Title': 'My Memory Chat',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!openRouterResponse.ok) {
      const error = await openRouterResponse.text();
      console.error('[Chat] OpenRouter API error:', error);
      return c.json({ success: false, error: 'Failed to generate response' }, 500);
    }

    const result = await openRouterResponse.json() as any;
    const assistantMessage = result.choices?.[0]?.message?.content || '';
    const usage = result.usage;

    // Save messages to conversation history
    const messageIndex = conversationHistory.length;
    const userMsgId = generateId('msg');
    const assistantMsgId = generateId('msg');
    const now = Date.now();

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO chat_messages (id, conversation_id, role, content, message_index, created_at)
         VALUES (?, ?, 'user', ?, ?, ?)`
      ).bind(userMsgId, currentConversationId, message, messageIndex, now),
      c.env.DB.prepare(
        `INSERT INTO chat_messages (id, conversation_id, role, content, sources_json, tokens_used, model, message_index, created_at)
         VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?)`
      ).bind(
        assistantMsgId,
        currentConversationId,
        assistantMessage,
        topSources.length > 0 ? JSON.stringify(topSources) : null,
        usage?.total_tokens || null,
        model,
        messageIndex + 1,
        now
      ),
      c.env.DB.prepare(
        `UPDATE chat_conversations
         SET total_messages = total_messages + 2,
             total_tokens = total_tokens + ?,
             last_message_at = ?,
             updated_at = ?
         WHERE id = ?`
      ).bind(usage?.total_tokens || 0, now, now, currentConversationId)
    ]);

    return c.json({
      success: true,
      conversationId: currentConversationId,
      message: assistantMessage,
      sources: topSources.map(s => ({
        id: s.id,
        type: s.type,
        preview: s.text.substring(0, 150) + (s.text.length > 150 ? '...' : ''),
        similarity: Math.round(s.similarity * 100) / 100
      })),
      usage: {
        totalTokens: usage?.total_tokens,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens
      }
    });

  } catch (error: any) {
    console.error('[Chat] Error:', error);
    return c.json({ success: false, error: error.message || 'Chat failed' }, 500);
  }
});

/**
 * GET /api/chat/conversations
 * List user's conversations
 */
router.get('/conversations', async (c) => {
  try {
    const userId = c.req.query('userId') || 'default_user';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const conversations = await c.env.DB.prepare(
      `SELECT id, title, summary, status, total_messages, last_message_at, created_at
       FROM chat_conversations
       WHERE user_id = ?
       ORDER BY last_message_at DESC
       LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all();

    return c.json({
      success: true,
      conversations: conversations.results || [],
      count: conversations.results?.length || 0
    });
  } catch (error: any) {
    console.error('[Chat] List conversations error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/chat/conversations/:id
 * Get a specific conversation with messages
 */
router.get('/conversations/:id', async (c) => {
  try {
    const conversationId = c.req.param('id');

    const conversation = await c.env.DB.prepare(
      `SELECT * FROM chat_conversations WHERE id = ?`
    ).bind(conversationId).first();

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    const messages = await c.env.DB.prepare(
      `SELECT id, role, content, sources_json, tokens_used, model, created_at
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY message_index ASC`
    ).bind(conversationId).all();

    return c.json({
      success: true,
      conversation,
      messages: (messages.results || []).map((m: any) => ({
        ...m,
        sources: m.sources_json ? JSON.parse(m.sources_json) : null,
        sources_json: undefined
      }))
    });
  } catch (error: any) {
    console.error('[Chat] Get conversation error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (c) => {
  try {
    const conversationId = c.req.param('id');

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').bind(conversationId),
      c.env.DB.prepare('DELETE FROM chat_conversations WHERE id = ?').bind(conversationId)
    ]);

    return c.json({ success: true, message: 'Conversation deleted' });
  } catch (error: any) {
    console.error('[Chat] Delete conversation error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PATCH /api/chat/conversations/:id
 * Update conversation title/summary
 */
router.patch('/conversations/:id', async (c) => {
  try {
    const conversationId = c.req.param('id');
    const { title, summary, status } = await c.req.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      values.push(summary);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(conversationId);

    await c.env.DB.prepare(
      `UPDATE chat_conversations SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true, message: 'Conversation updated' });
  } catch (error: any) {
    console.error('[Chat] Update conversation error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
