import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';

const router = new Hono<{ Bindings: Env }>();

/**
 * GET /
 * List all tasks with optional filtering
 */
router.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = 'SELECT * FROM tasks';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Parse JSON fields
    const tasks = (result.results || []).map((task: any) => ({
      ...task,
      source_context: task.source_context ? JSON.parse(task.source_context) : null,
      conversation_thread: task.conversation_thread ? JSON.parse(task.conversation_thread) : [],
    }));

    return c.json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    console.error('List tasks error:', error);
    return c.json({ error: 'Failed to list tasks', message: error.message }, 500);
  }
});

/**
 * GET /:id
 * Get a specific task by ID
 */
router.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();

    if (!result) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Parse JSON fields
    const task = {
      ...result,
      source_context: result.source_context ? JSON.parse(result.source_context as string) : null,
      conversation_thread: result.conversation_thread ? JSON.parse(result.conversation_thread as string) : [],
    };

    return c.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error('Get task error:', error);
    return c.json({ error: 'Failed to get task', message: error.message }, 500);
  }
});

/**
 * POST /
 * Create a new task
 */
router.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { task, source_item_id, source_item_type, source_text, source_url, source_context } = body;

    if (!task) {
      return c.json({ error: 'Task description is required' }, 400);
    }

    const id = generateId();
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, task, source_item_id, source_item_type, source_text, source_url,
        source_context, status, conversation_thread, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      task,
      source_item_id || null,
      source_item_type || null,
      source_text || null,
      source_url || null,
      source_context ? JSON.stringify(source_context) : null,
      'pending',
      JSON.stringify([]),
      now,
      now
    ).run();

    return c.json({
      success: true,
      message: 'Task created',
      task_id: id,
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    return c.json({ error: 'Failed to create task', message: error.message }, 500);
  }
});

/**
 * PUT /:id
 * Update a task (status, response, etc.)
 */
router.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, response } = body;

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (response !== undefined) {
      updates.push('response = ?');
      params.push(response);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    await c.env.DB.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return c.json({
      success: true,
      message: 'Task updated',
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    return c.json({ error: 'Failed to update task', message: error.message }, 500);
  }
});

/**
 * POST /:id/follow-up
 * Add a follow-up message to the task conversation thread
 */
router.post('/:id/follow-up', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { message, type = 'user' } = body;

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Get current task
    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Parse current conversation thread
    const thread = task.conversation_thread ? JSON.parse(task.conversation_thread as string) : [];

    // Add new message
    thread.push({
      type,
      message,
      timestamp: Date.now(),
    });

    // Update task
    await c.env.DB.prepare(`
      UPDATE tasks SET conversation_thread = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(thread), Date.now(), id).run();

    return c.json({
      success: true,
      message: 'Follow-up added',
    });
  } catch (error: any) {
    console.error('Add follow-up error:', error);
    return c.json({ error: 'Failed to add follow-up', message: error.message }, 500);
  }
});

/**
 * DELETE /:id
 * Delete a task
 */
router.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();

    return c.json({
      success: true,
      message: 'Task deleted',
    });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return c.json({ error: 'Failed to delete task', message: error.message }, 500);
  }
});

export default router;
