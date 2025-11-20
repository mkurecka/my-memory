import { Hono } from 'hono';
import type { Env, Memory } from '../types';
import { verifyJWT } from '../utils/jwt';
import { generateId } from '../utils/id';

const memory = new Hono<{ Bindings: Env }>();

// Authentication middleware
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ success: false, error: 'No authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', payload.userId);
  await next();
}

// POST /api/memory - Create memory
memory.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { text, context, tag, priority = 'medium' } = await c.req.json();

    if (!text) {
      return c.json({
        success: false,
        error: 'Text is required',
      }, 400);
    }

    const memoryId = generateId();
    const now = Date.now();

    await c.env.DB
      .prepare(`
        INSERT INTO memory (id, user_id, text, context_json, tag, priority, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        memoryId,
        userId,
        text,
        context ? JSON.stringify(context) : null,
        tag || null,
        priority,
        now
      )
      .run();

    return c.json({
      success: true,
      memoryId,
      message: 'Memory saved successfully',
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
memory.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const memoryId = c.req.param('id');

    const memoryItem = await c.env.DB
      .prepare('SELECT * FROM memory WHERE id = ? AND user_id = ?')
      .bind(memoryId, userId)
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

export default memory;
