/**
 * REST API routes for work sessions
 * Provides direct HTTP access alongside MCP tools
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { saveWorkSession, searchWorkSessions, getWorkSession, listWorkProjects } from './mcp-sessions';

const workSessions = new Hono<{ Bindings: Env }>();

// POST / - Save a work session
workSessions.post('/', async (c) => {
  const body = await c.req.json();
  const result = await saveWorkSession(c.env, body);
  const data = JSON.parse(result.content[0].text);
  return c.json({ success: !result.isError, ...data });
});

// GET / - List sessions (query: project, limit, offset)
workSessions.get('/', async (c) => {
  const project = c.req.query('project');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  let sql = 'SELECT * FROM work_sessions';
  const bindings: any[] = [];

  if (project) {
    sql += ' WHERE project = ?';
    bindings.push(project);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const result = await c.env.DB.prepare(sql).bind(...bindings).all();
  const sessions = (result.results || []).map((row: any) => ({
    ...row,
    changes: row.changes ? JSON.parse(row.changes) : [],
    errors: row.errors ? JSON.parse(row.errors) : [],
    open_items: row.open_items ? JSON.parse(row.open_items) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    verified: !!row.verified,
  }));

  return c.json({ success: true, sessions, count: sessions.length });
});

// GET /projects - List projects with counts
workSessions.get('/projects', async (c) => {
  const result = await listWorkProjects(c.env);
  const data = JSON.parse(result.content[0].text);
  return c.json({ success: true, ...data });
});

// GET /:id - Get a single session
workSessions.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await getWorkSession(c.env, { id });
  const data = JSON.parse(result.content[0].text);
  return c.json({ success: !result.isError, ...data });
});

// POST /search - Search sessions
workSessions.post('/search', async (c) => {
  const body = await c.req.json();
  const result = await searchWorkSessions(c.env, body);
  const data = JSON.parse(result.content[0].text);
  return c.json({ success: !result.isError, ...data });
});

export default workSessions;
