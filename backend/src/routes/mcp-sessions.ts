/**
 * MCP Session Tools - Work session storage with semantic search
 * Ported from session-storage-worker, upgraded with Vectorize embeddings
 */

import type { Env } from '../types';
import { generateEmbedding, vectorSearch, insertVector } from '../utils/embeddings';
import { generateId } from '../utils/id';

interface WorkSession {
  id: string;
  project: string;
  jira_ref?: string;
  goal: string;
  summary?: string;
  changes?: string[];
  errors?: string[];
  open_items?: string[];
  tags?: string[];
  verified?: boolean;
  created_at: number;
  updated_at: number;
}

function deserializeSession(row: any): WorkSession {
  return {
    ...row,
    changes: row.changes ? JSON.parse(row.changes) : [],
    errors: row.errors ? JSON.parse(row.errors) : [],
    open_items: row.open_items ? JSON.parse(row.open_items) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    verified: !!row.verified,
  };
}

function buildEmbeddingText(args: any): string {
  const parts = [args.goal || ''];
  if (args.summary) parts.push(args.summary);
  if (args.tags?.length) parts.push(args.tags.join(', '));
  if (args.errors?.length) parts.push(args.errors.join('; '));
  if (args.project) parts.push(`project: ${args.project}`);
  return parts.join('\n');
}

/**
 * Save a work session to D1 + Vectorize
 */
export async function saveWorkSession(env: Env, args: any) {
  const { project, jira_ref, goal, summary, changes, errors, open_items, tags, verified } = args;

  if (!project || !goal) {
    return {
      content: [{ type: 'text', text: 'Error: project and goal are required' }],
      isError: true,
    };
  }

  const id = generateId('ws');
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO work_sessions (id, project, jira_ref, goal, summary, changes, errors, open_items, tags, verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    project,
    jira_ref || null,
    goal,
    summary || null,
    changes ? JSON.stringify(changes) : null,
    errors ? JSON.stringify(errors) : null,
    open_items ? JSON.stringify(open_items) : null,
    tags ? JSON.stringify(tags) : null,
    verified ? 1 : 0,
    now,
    now,
  ).run();

  // Generate embedding and upsert to Vectorize
  const embeddingText = buildEmbeddingText(args);
  const embedding = await generateEmbedding(env, embeddingText);
  if (embedding) {
    await insertVector(env, id, embedding, {
      table: 'work_sessions',
      type: 'session',
      project,
    });
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ id, status: 'saved', created_at: new Date(now).toISOString() }),
    }],
  };
}

/**
 * Search work sessions using semantic search with LIKE fallback
 */
export async function searchWorkSessions(env: Env, args: any) {
  const { query, project, limit = 10 } = args;

  if (!query) {
    return {
      content: [{ type: 'text', text: 'Error: query is required' }],
      isError: true,
    };
  }

  // Try semantic search first
  const queryEmbedding = await generateEmbedding(env, query);
  let sessions: WorkSession[] = [];

  if (queryEmbedding) {
    const vectorResults = await vectorSearch(env, queryEmbedding, null, {
      topK: limit * 2,
      minScore: 0.5,
      table: 'work_sessions',
    });

    if (vectorResults.length > 0) {
      const ids = vectorResults.map(r => r.id);
      const placeholders = ids.map(() => '?').join(',');
      let sql = `SELECT * FROM work_sessions WHERE id IN (${placeholders})`;
      const bindings: any[] = [...ids];

      if (project) {
        sql += ' AND project = ?';
        bindings.push(project);
      }

      const dbResults = await env.DB.prepare(sql).bind(...bindings).all();
      const resultsMap = new Map((dbResults.results || []).map((r: any) => [r.id, r]));

      // Maintain vector score ordering
      sessions = vectorResults
        .map(vr => resultsMap.get(vr.id))
        .filter(Boolean)
        .map(deserializeSession)
        .slice(0, limit);
    }
  }

  // Fallback to LIKE search if semantic returned nothing
  if (sessions.length === 0) {
    const likeQuery = `%${query}%`;
    let sql = `SELECT * FROM work_sessions WHERE (goal LIKE ? OR summary LIKE ? OR changes LIKE ? OR tags LIKE ?)`;
    const bindings: any[] = [likeQuery, likeQuery, likeQuery, likeQuery];

    if (project) {
      sql += ' AND project = ?';
      bindings.push(project);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    bindings.push(limit);

    const dbResults = await env.DB.prepare(sql).bind(...bindings).all();
    sessions = (dbResults.results || []).map(deserializeSession);
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ sessions, count: sessions.length }),
    }],
  };
}

/**
 * Get a single work session by ID
 */
export async function getWorkSession(env: Env, args: any) {
  const { id } = args;

  if (!id) {
    return {
      content: [{ type: 'text', text: 'Error: id is required' }],
      isError: true,
    };
  }

  const row = await env.DB.prepare('SELECT * FROM work_sessions WHERE id = ?').bind(id).first();

  if (!row) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Session not found' }) }],
      isError: true,
    };
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(deserializeSession(row)),
    }],
  };
}

/**
 * List all projects with session counts
 */
export async function listWorkProjects(env: Env) {
  const result = await env.DB.prepare(`
    SELECT project, COUNT(*) as session_count, MAX(created_at) as last_session
    FROM work_sessions
    GROUP BY project
    ORDER BY last_session DESC
  `).all();

  const projects = (result.results || []).map((r: any) => ({
    project: r.project,
    session_count: r.session_count,
    last_session: new Date(r.last_session).toISOString(),
  }));

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ projects }),
    }],
  };
}
