import { Hono } from 'hono';
import type { Env, Post } from '../types';
import { verifyJWT } from '../utils/jwt';

const posts = new Hono<{ Bindings: Env }>();

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

// GET /api/posts - List all posts
posts.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { status, type, limit = '50', offset = '0' } = c.req.query();

    let query = 'SELECT * FROM posts WHERE user_id = ?';
    const bindings: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      bindings.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(parseInt(limit), parseInt(offset));

    const result = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all<Post>();

    return c.json({
      success: true,
      posts: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('List posts error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to list posts',
    }, 500);
  }
});

// GET /api/posts/:id - Get single post
posts.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('id');

    const post = await c.env.DB
      .prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?')
      .bind(postId, userId)
      .first<Post>();

    if (!post) {
      return c.json({
        success: false,
        error: 'Post not found',
      }, 404);
    }

    return c.json({
      success: true,
      post,
    });
  } catch (error: any) {
    console.error('Get post error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get post',
    }, 500);
  }
});

// PATCH /api/posts/:id - Update post status
posts.patch('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('id');
    const { status, generated_output } = await c.req.json();

    if (!status && !generated_output) {
      return c.json({
        success: false,
        error: 'Status or generated_output is required',
      }, 400);
    }

    // Verify post belongs to user
    const existing = await c.env.DB
      .prepare('SELECT id FROM posts WHERE id = ? AND user_id = ?')
      .bind(postId, userId)
      .first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'Post not found',
      }, 404);
    }

    const now = Date.now();
    const updates: string[] = [];
    const bindings: any[] = [];

    if (status) {
      updates.push('status = ?');
      bindings.push(status);
    }

    if (generated_output) {
      updates.push('generated_output = ?');
      bindings.push(generated_output);
    }

    updates.push('updated_at = ?');
    bindings.push(now);

    bindings.push(postId, userId);

    await c.env.DB
      .prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...bindings)
      .run();

    return c.json({
      success: true,
      message: 'Post updated successfully',
    });
  } catch (error: any) {
    console.error('Update post error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update post',
    }, 500);
  }
});

// DELETE /api/posts/:id - Delete post
posts.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM posts WHERE id = ? AND user_id = ?')
      .bind(postId, userId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: 'Post not found',
      }, 404);
    }

    return c.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to delete post',
    }, 500);
  }
});

// GET /api/posts/stats - Get post statistics
posts.get('/stats/summary', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const stats = await c.env.DB
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM posts
        WHERE user_id = ?
      `)
      .bind(userId)
      .first<any>();

    return c.json({
      success: true,
      stats: stats || {
        total: 0,
        pending: 0,
        approved: 0,
        done: 0,
        rejected: 0,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get stats',
    }, 500);
  }
});

export default posts;
