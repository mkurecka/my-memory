/**
 * Claude Code Sessions API
 * Endpoints for storing and retrieving Claude Code / AI coding session data
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';

const router = new Hono<{ Bindings: Env }>();

const DEFAULT_USER = 'claude_user';

/**
 * POST /api/claude/sessions
 * Create a new Claude Code session or update existing one
 * 
 * Body: {
 *   session_id?: string,      // External session ID (from Claude Code)
 *   title?: string,           // Session title/description
 *   summary?: string,         // Session summary
 *   project_path?: string,    // Project directory path
 *   working_directory?: string,
 *   status?: 'active' | 'completed' | 'cancelled',
 *   started_at?: number,      // Unix timestamp
 *   ended_at?: number,        // Unix timestamp
 *   duration_seconds?: number,
 *   total_messages?: number,
 *   total_tokens?: number,
 *   cost_usd?: number,
 *   model?: string,
 *   tags?: string[],
 *   metadata?: object
 * }
 */
router.post('/sessions', async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.req.header('X-User-ID') || DEFAULT_USER;
    
    const {
      session_id,
      title,
      summary,
      project_path,
      working_directory,
      status = 'active',
      started_at,
      ended_at,
      duration_seconds,
      total_messages,
      total_tokens,
      cost_usd,
      model,
      tags,
      metadata
    } = body;

    // Check if session exists (by id or session_id)
    let existingSession = null;
    if (session_id) {
      existingSession = await c.env.DB.prepare(
        'SELECT id FROM claude_sessions WHERE id = ? OR session_id = ?'
      ).bind(session_id, session_id).first();
    }

    const now = Date.now();
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    if (existingSession) {
      // Update existing session
      await c.env.DB.prepare(`
        UPDATE claude_sessions SET
          title = COALESCE(?, title),
          summary = COALESCE(?, summary),
          project_path = COALESCE(?, project_path),
          working_directory = COALESCE(?, working_directory),
          status = COALESCE(?, status),
          started_at = COALESCE(?, started_at),
          ended_at = COALESCE(?, ended_at),
          duration_seconds = COALESCE(?, duration_seconds),
          total_messages = COALESCE(?, total_messages),
          total_tokens = COALESCE(?, total_tokens),
          cost_usd = COALESCE(?, cost_usd),
          model = COALESCE(?, model),
          tags = COALESCE(?, tags),
          metadata_json = COALESCE(?, metadata_json),
          updated_at = ?
        WHERE id = ?
      `).bind(
        title || null, 
        summary || null, 
        project_path || null, 
        working_directory || null, 
        status || null,
        started_at || null, 
        ended_at || null, 
        duration_seconds || null, 
        total_messages || null,
        total_tokens || null, 
        cost_usd || null, 
        model || null, 
        tagsStr || null, 
        metadataJson,
        now, 
        existingSession.id
      ).run();

      return c.json({
        success: true,
        message: 'Session updated',
        id: existingSession.id,
        session_id
      });
    }

    // Create new session - use session_id as id if provided, otherwise generate one
    const id = session_id || generateId('cls');
    
    await c.env.DB.prepare(`
      INSERT INTO claude_sessions (
        id, user_id, session_id, title, summary, project_path, working_directory,
        status, started_at, ended_at, duration_seconds, total_messages,
        total_tokens, cost_usd, model, tags, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, 
      userId, 
      session_id || null, 
      title || null, 
      summary || null, 
      project_path || null, 
      working_directory || null,
      status || 'active', 
      started_at || now, 
      ended_at || null, 
      duration_seconds || null, 
      total_messages || 0,
      total_tokens || 0, 
      cost_usd || 0, 
      model || null, 
      tagsStr || null, 
      metadataJson, 
      now, 
      now
    ).run();

    return c.json({
      success: true,
      message: 'Session created',
      id
    }, 201);

  } catch (error) {
    console.error('[Claude Sessions] Create error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session'
    }, 500);
  }
});

/**
 * POST /api/claude/sessions/:id/messages
 * Add a message to a session
 * 
 * Body: {
 *   role: 'user' | 'assistant' | 'system',
 *   content: string,
 *   tool_calls?: object[],
 *   tool_results?: object[],
 *   tokens_used?: number,
 *   model?: string,
 *   message_index?: number
 * }
 */
router.post('/sessions/:id/messages', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const body = await c.req.json();
    
    const {
      role,
      content,
      tool_calls,
      tool_results,
      tokens_used,
      model,
      message_index
    } = body;

    if (!role || !content) {
      return c.json({ success: false, error: 'role and content are required' }, 400);
    }

    // Verify session exists
    const session = await c.env.DB.prepare(
      'SELECT id FROM claude_sessions WHERE id = ? OR session_id = ?'
    ).bind(sessionId, sessionId).first();

    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    const id = generateId('msg');
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO claude_messages (
        id, session_id, role, content, tool_calls_json, tool_results_json,
        tokens_used, model, message_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      session.id,
      role,
      content,
      tool_calls ? JSON.stringify(tool_calls) : null,
      tool_results ? JSON.stringify(tool_results) : null,
      tokens_used || null,
      model || null,
      message_index || null,
      now
    ).run();

    // Update session message count
    await c.env.DB.prepare(`
      UPDATE claude_sessions SET 
        total_messages = total_messages + 1,
        total_tokens = total_tokens + COALESCE(?, 0),
        updated_at = ?
      WHERE id = ?
    `).bind(tokens_used || 0, now, session.id).run();

    return c.json({
      success: true,
      message: 'Message added',
      id
    }, 201);

  } catch (error) {
    console.error('[Claude Sessions] Add message error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add message'
    }, 500);
  }
});

/**
 * POST /api/claude/sessions/:id/messages/bulk
 * Add multiple messages to a session at once
 *
 * Body: Array of messages [{role, content, model?, tokens?, timestamp?, uuid?}]
 */
router.post('/sessions/:id/messages/bulk', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const messages = await c.req.json();

    if (!Array.isArray(messages)) {
      return c.json({ success: false, error: 'Body must be an array of messages' }, 400);
    }

    // Verify session exists or create it
    let session = await c.env.DB.prepare(
      'SELECT id FROM claude_sessions WHERE id = ? OR session_id = ?'
    ).bind(sessionId, sessionId).first<{ id: string }>();

    if (!session) {
      // Auto-create session if it doesn't exist
      const now = Date.now();
      await c.env.DB.prepare(`
        INSERT INTO claude_sessions (id, user_id, session_id, status, started_at, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?)
      `).bind(sessionId, 'claude_user', sessionId, now, now, now).run();
      session = { id: sessionId };
    }

    const now = Date.now();
    let insertedCount = 0;
    let totalTokens = 0;

    // Insert messages in batch
    for (const msg of messages) {
      if (!msg.role || !msg.content) continue;

      const id = generateId('msg');
      const tokensUsed = (msg.tokens?.input || 0) + (msg.tokens?.output || 0);
      totalTokens += tokensUsed;

      await c.env.DB.prepare(`
        INSERT INTO claude_messages (
          id, session_id, role, content, tokens_used, model, message_index, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        session.id,
        msg.role,
        msg.content,
        tokensUsed || null,
        msg.model || null,
        insertedCount,
        msg.timestamp || now
      ).run();

      insertedCount++;
    }

    // Update session totals
    await c.env.DB.prepare(`
      UPDATE claude_sessions SET
        total_messages = total_messages + ?,
        total_tokens = total_tokens + ?,
        updated_at = ?
      WHERE id = ?
    `).bind(insertedCount, totalTokens, now, session.id).run();

    return c.json({
      success: true,
      message: 'Messages added',
      count: insertedCount,
      total_tokens: totalTokens
    }, 201);

  } catch (error) {
    console.error('[Claude Sessions] Bulk add error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add messages'
    }, 500);
  }
});

/**
 * POST /api/claude/sessions/:id/end
 * End/complete a session
 * 
 * Body: {
 *   summary?: string,
 *   ended_at?: number,
 *   total_tokens?: number,
 *   cost_usd?: number
 * }
 */
router.post('/sessions/:id/end', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    
    const { summary, ended_at, total_tokens, cost_usd } = body;
    const now = Date.now();

    // Get session to calculate duration
    const session = await c.env.DB.prepare(
      'SELECT id, started_at FROM claude_sessions WHERE id = ? OR session_id = ?'
    ).bind(sessionId, sessionId).first<any>();

    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    const endTime = ended_at || now;
    const duration = session.started_at ? Math.floor((endTime - session.started_at) / 1000) : null;

    await c.env.DB.prepare(`
      UPDATE claude_sessions SET
        status = 'completed',
        summary = COALESCE(?, summary),
        ended_at = ?,
        duration_seconds = COALESCE(?, duration_seconds),
        total_tokens = COALESCE(?, total_tokens),
        cost_usd = COALESCE(?, cost_usd),
        updated_at = ?
      WHERE id = ?
    `).bind(summary || null, endTime, duration, total_tokens || null, cost_usd || null, now, session.id).run();

    return c.json({
      success: true,
      message: 'Session ended',
      id: session.id,
      duration_seconds: duration
    });

  } catch (error) {
    console.error('[Claude Sessions] End session error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to end session'
    }, 500);
  }
});

/**
 * GET /api/claude/sessions
 * List all sessions
 */
router.get('/sessions', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const status = c.req.query('status');
    const project = c.req.query('project');

    let sql = 'SELECT * FROM claude_sessions';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (project) {
      conditions.push('project_path LIKE ?');
      params.push(`%${project}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = await c.env.DB.prepare(sql).bind(...params).all();

    return c.json({
      success: true,
      sessions: results.results || [],
      count: results.results?.length || 0
    });

  } catch (error) {
    console.error('[Claude Sessions] List error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions'
    }, 500);
  }
});

/**
 * GET /api/claude/sessions/:id
 * Get a single session with messages
 */
router.get('/sessions/:id', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const includeMessages = c.req.query('messages') !== 'false';

    const session = await c.env.DB.prepare(
      'SELECT * FROM claude_sessions WHERE id = ? OR session_id = ?'
    ).bind(sessionId, sessionId).first();

    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    let messages: any[] = [];
    if (includeMessages) {
      const messagesResult = await c.env.DB.prepare(
        'SELECT * FROM claude_messages WHERE session_id = ? ORDER BY message_index ASC, created_at ASC'
      ).bind(session.id).all();
      messages = messagesResult.results || [];
    }

    return c.json({
      success: true,
      session,
      messages
    });

  } catch (error) {
    console.error('[Claude Sessions] Get error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session'
    }, 500);
  }
});

/**
 * DELETE /api/claude/sessions/:id
 * Delete a session and its messages
 */
router.delete('/sessions/:id', async (c) => {
  try {
    const sessionId = c.req.param('id');

    const session = await c.env.DB.prepare(
      'SELECT id FROM claude_sessions WHERE id = ? OR session_id = ?'
    ).bind(sessionId, sessionId).first<any>();

    if (!session) {
      return c.json({ success: false, error: 'Session not found' }, 404);
    }

    // Delete messages first (cascade should handle this, but be explicit)
    await c.env.DB.prepare('DELETE FROM claude_messages WHERE session_id = ?').bind(session.id).run();
    await c.env.DB.prepare('DELETE FROM claude_sessions WHERE id = ?').bind(session.id).run();

    return c.json({
      success: true,
      message: 'Session deleted'
    });

  } catch (error) {
    console.error('[Claude Sessions] Delete error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete session'
    }, 500);
  }
});

export default router;
