/**
 * MCP (Model Context Protocol) Routes - Streamable HTTP transport for Claude Desktop/Code
 * Implements MCP JSON-RPC protocol over HTTP POST
 *
 * This implementation uses the stateless "Streamable HTTP" transport which is
 * better suited for Cloudflare Workers than SSE (which requires persistent connections).
 *
 * Auth: Optional via Authorization header (Bearer token or API key)
 * - initialize, tools/list work without auth
 * - Tool calls require auth to access user data
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { verifyJWT } from '../utils/jwt';
import { generateEmbedding, vectorSearch } from '../utils/embeddings';
import { generateId } from '../utils/id';
import { saveWorkSession, searchWorkSessions, getWorkSession, listWorkProjects } from './mcp-sessions';
import { analyzeMemory } from '../utils/memory-analyzer';

const mcp = new Hono<{ Bindings: Env }>();

// MCP Protocol version
const MCP_VERSION = '2024-11-05';

/**
 * Extract user ID from auth header or query param
 * Supports: Authorization header (Bearer token/API key) or ?key= query param
 */
async function getUserFromAuth(c: any): Promise<string | null> {
  // Try Authorization header first
  const authHeader = c.req.header('Authorization');
  let token = authHeader ? authHeader.replace('Bearer ', '') : null;

  // Fallback to query param for Claude custom connectors
  if (!token) {
    token = c.req.query('key');
  }

  if (!token) return null;

  // Try API key first (mm_ prefix)
  if (token.startsWith('mm_')) {
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE api_key = ?'
    ).bind(token).first();
    return user?.id || null;
  }

  // Try JWT
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  return payload?.userId || null;
}

/**
 * POST /mcp - Main MCP endpoint
 * Handles all JSON-RPC requests and returns responses directly
 */
mcp.post('/', async (c) => {
  const userId = await getUserFromAuth(c);
  const request = await c.req.json();

  // Handle batch requests
  if (Array.isArray(request)) {
    const responses = await Promise.all(
      request.map(req => handleSingleRequest(c.env, userId, req))
    );
    return c.json(responses);
  }

  // Handle single request
  const response = await handleSingleRequest(c.env, userId, request);
  return c.json(response);
});

/**
 * GET /mcp - Server info (for discovery)
 */
mcp.get('/', (c) => {
  return c.json({
    name: 'my-memory-mcp',
    version: '1.0.0',
    protocolVersion: MCP_VERSION,
    description: 'My Memory MCP Server - Save and search your memories',
    transport: 'streamable-http',
    endpoints: {
      rpc: '/mcp'
    }
  });
});

/**
 * Handle a single JSON-RPC request
 */
async function handleSingleRequest(
  env: Env,
  userId: string | null,
  request: any
): Promise<any> {
  const { jsonrpc = '2.0', id, method, params = {} } = request;

  console.log(`[MCP] Request: ${method}`, userId ? `(user: ${userId})` : '(no auth)');

  try {
    const result = await handleMcpRequest(env, userId, method, params);
    return { jsonrpc, id, result };
  } catch (error: any) {
    console.error(`[MCP] Error in ${method}:`, error);
    return {
      jsonrpc,
      id,
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal error'
      }
    };
  }
}

/**
 * Handle MCP JSON-RPC requests
 */
async function handleMcpRequest(
  env: Env,
  userId: string | null,
  method: string,
  params: any
): Promise<any> {
  switch (method) {
    case 'initialize':
      return handleInitialize(params);

    case 'initialized':
      return {}; // Acknowledgment

    case 'tools/list':
      return handleListTools();

    case 'tools/call': {
      // Session tools are global (no user scoping needed)
      const sessionTools = ['save_session', 'search_sessions', 'get_session', 'list_projects'];
      const toolName = params?.name;

      if (sessionTools.includes(toolName)) {
        return handleToolCall(env, userId || '__system__', params);
      }

      // Other tool calls require authentication
      if (!userId) {
        const error = new Error('Authentication required. Provide API key via Authorization header.');
        (error as any).code = -32001;
        throw error;
      }
      return handleToolCall(env, userId, params);
    }

    case 'resources/list':
      if (!userId) {
        return { resources: [] }; // Return empty list if not authenticated
      }
      return handleListResources(env, userId);

    case 'resources/read':
      if (!userId) {
        const error = new Error('Authentication required to read resources.');
        (error as any).code = -32001;
        throw error;
      }
      return handleReadResource(env, userId, params);

    case 'ping':
      return {};

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

/**
 * Handle initialize request
 */
function handleInitialize(params: any) {
  return {
    protocolVersion: MCP_VERSION,
    capabilities: {
      tools: {},
      resources: {}
    },
    serverInfo: {
      name: 'my-memory-mcp',
      version: '1.0.0'
    }
  };
}

/**
 * List available tools
 */
function handleListTools() {
  return {
    tools: [
      {
        name: 'search_memory',
        description: 'Search through saved memories using semantic search. Supports filtering by date, category, priority, and tag.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query - natural language works best for semantic search'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)'
            },
            tag: {
              type: 'string',
              description: "Filter by tag: 'link', 'video', 'tweet', or custom tag"
            },
            category: {
              type: 'string',
              description: "Filter by AI-analyzed category (e.g. 'AI & Technology', 'Business', 'Marketing')"
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Filter by action priority from AI analysis'
            },
            days_back: {
              type: 'number',
              description: 'Only search items saved within the last N days (e.g. 7 for last week)'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'save_memory',
        description: 'Save content to memory. Can save text notes, URLs (auto-enriched with metadata), or any content you want to remember later.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The content to save - can be a URL or text note'
            },
            tag: {
              type: 'string',
              description: "Optional tag to categorize: 'link', 'video', 'tweet', or custom"
            },
            context: {
              type: 'object',
              description: 'Optional metadata to attach to the memory'
            }
          },
          required: ['text']
        }
      },
      {
        name: 'save_media_memory',
        description: 'Save an image or video as a memory. Extracts text (OCR), descriptions, topics, and data from the media using vision AI, then saves as a searchable memory.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the image or video to process'
            },
            type: {
              type: 'string',
              enum: ['image', 'video'],
              description: "Type of media: 'image' or 'video' (default: 'image')"
            },
            note: {
              type: 'string',
              description: 'Optional note to attach to the memory for additional context'
            },
            tag: {
              type: 'string',
              description: "Optional tag to categorize (default: 'image' or 'video')"
            }
          },
          required: ['url']
        }
      },
      {
        name: 'list_memories',
        description: 'List recent memories with optional filtering by tag or type.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)'
            },
            tag: {
              type: 'string',
              description: "Filter by tag: 'link', 'video', 'tweet', or custom"
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)'
            }
          }
        }
      },
      {
        name: 'get_memory',
        description: 'Get a specific memory by its ID to see full details and context.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to retrieve'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete a specific memory by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to delete'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'save_session',
        description: 'Save a completed work session with goal, summary, changes, errors, and open items',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Project name/directory' },
            jira_ref: { type: 'string', description: 'Optional Jira/Linear issue reference' },
            goal: { type: 'string', description: 'Session goal' },
            summary: { type: 'string', description: 'Summary of what was accomplished' },
            changes: { type: 'array', items: { type: 'string' }, description: 'List of files changed' },
            errors: { type: 'array', items: { type: 'string' }, description: 'Errors encountered' },
            open_items: { type: 'array', items: { type: 'string' }, description: 'Open questions or unfinished items' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
            verified: { type: 'boolean', description: 'Whether the work was verified/tested' },
          },
          required: ['project', 'goal'],
        },
      },
      {
        name: 'search_sessions',
        description: 'Search across all work sessions using semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            project: { type: 'string', description: 'Optional: filter by project' },
            limit: { type: 'number', description: 'Max results (default 10)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_session',
        description: 'Retrieve a specific work session by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Session ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects with session counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'find_related',
        description: 'Find items related to a specific memory or post using vector similarity. Great for discovering connections in your knowledge base.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory/post to find related items for'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of related items (default: 5)'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'get_insights',
        description: 'Get aggregated insights from your knowledge base. Shows top categories, topics, high-priority items, and content with high potential.',
        inputSchema: {
          type: 'object',
          properties: {
            focus: {
              type: 'string',
              enum: ['overview', 'high_priority', 'topics', 'categories'],
              description: 'What aspect to focus on (default: overview)'
            },
            days_back: {
              type: 'number',
              description: 'Only analyze items from the last N days'
            }
          }
        }
      }
    ]
  };
}

/**
 * Handle tool calls
 */
async function handleToolCall(env: Env, userId: string, params: any): Promise<any> {
  const { name, arguments: args } = params;

  switch (name) {
    case 'search_memory':
      return searchMemory(env, userId, args);

    case 'save_memory':
      return saveMemory(env, userId, args);

    case 'list_memories':
      return listMemories(env, userId, args);

    case 'get_memory':
      return getMemory(env, userId, args);

    case 'delete_memory':
      return deleteMemory(env, userId, args);

    case 'save_media_memory':
      return saveMediaMemory(env, userId, args);

    case 'save_session':
      return saveWorkSession(env, args);

    case 'search_sessions':
      return searchWorkSessions(env, args);

    case 'get_session':
      return getWorkSession(env, args);

    case 'list_projects':
      return listWorkProjects(env);

    case 'find_related':
      return findRelated(env, args);

    case 'get_insights':
      return getInsights(env, args || {});

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Search memories using semantic search
 */
async function searchMemory(env: Env, userId: string, args: any) {
  const { query, limit = 10, tag, category, priority, days_back } = args;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(env, query);
  if (!queryEmbedding) {
    return {
      content: [{ type: 'text', text: 'Error: Failed to generate search embedding' }],
      isError: true
    };
  }

  // Search both memory and posts tables via Vectorize
  const [memoryResults, postsResults] = await Promise.all([
    vectorSearch(env, queryEmbedding, userId, { topK: limit, minScore: 0.5, table: 'memory' }),
    vectorSearch(env, queryEmbedding, userId, { topK: limit, minScore: 0.5, table: 'posts' })
  ]);

  const allVectorResults = [...memoryResults, ...postsResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (allVectorResults.length === 0) {
    return {
      content: [{ type: 'text', text: 'No matching memories found.' }]
    };
  }

  // Separate IDs by table
  const memoryIds = allVectorResults.filter(r => memoryResults.some(m => m.id === r.id)).map(r => r.id);
  const postIds = allVectorResults.filter(r => postsResults.some(p => p.id === r.id)).map(r => r.id);

  // Fetch full records from both tables
  const allRecords: any[] = [];

  if (memoryIds.length > 0) {
    const placeholders = memoryIds.map(() => '?').join(',');
    const dbResults = await env.DB.prepare(
      `SELECT id, text, context_json, tag, created_at FROM memory WHERE id IN (${placeholders})`
    ).bind(...memoryIds).all();
    allRecords.push(...(dbResults.results || []).map((r: any) => ({ ...r, _source: 'memory' })));
  }

  if (postIds.length > 0) {
    const placeholders = postIds.map(() => '?').join(',');
    const dbResults = await env.DB.prepare(
      `SELECT id, original_text, generated_output, context_json, type, created_at FROM posts WHERE id IN (${placeholders})`
    ).bind(...postIds).all();
    allRecords.push(...(dbResults.results || []).map((r: any) => ({
      id: r.id,
      text: r.original_text || r.generated_output || '',
      context_json: r.context_json,
      tag: r.type,
      created_at: r.created_at,
      generated_output: r.generated_output,
      _source: 'posts'
    })));
  }

  // Merge with scores
  const resultsMap = new Map(allRecords.map((r: any) => [r.id, r]));
  let results = allVectorResults.map(vr => ({
    ...resultsMap.get(vr.id),
    similarity: vr.score
  })).filter(r => r.id);

  // Apply filters
  if (tag) {
    results = results.filter(r => r.tag === tag);
  }
  if (category) {
    results = results.filter(r => {
      try {
        const ctx = r.context_json ? JSON.parse(r.context_json) : {};
        return ctx.analysis?.category === category;
      } catch { return false; }
    });
  }
  if (priority) {
    results = results.filter(r => {
      try {
        const ctx = r.context_json ? JSON.parse(r.context_json) : {};
        return ctx.analysis?.actionPriority === priority;
      } catch { return false; }
    });
  }
  if (days_back) {
    const cutoff = Date.now() - (days_back * 86400000);
    results = results.filter(r => r.created_at >= cutoff);
  }

  // Format results
  const formatted = results.map((r: any, i: number) => {
    const context = r.context_json ? JSON.parse(r.context_json) : {};
    const title = context.title || context.extractedTitle || context.pageTitle || '';
    const similarity = r.similarity ? ` (${(r.similarity * 100).toFixed(1)}% match)` : '';
    const source = r._source === 'posts' ? ` [${r.tag || 'post'}]` : '';
    const content = r.generated_output || r.text || '';

    let output = `${i + 1}. [${r.id}]${similarity}${source}`;
    if (title) output += `\n   Title: ${title}`;
    output += `\n   Content: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`;
    if (r.tag && r._source === 'memory') output += `\n   Tag: ${r.tag}`;
    const analysis = context.analysis;
    if (analysis?.category) output += `\n   Category: ${analysis.category}`;
    if (analysis?.actionPriority) output += `\n   Priority: ${analysis.actionPriority}`;
    if (analysis?.topics?.length) output += `\n   Topics: ${analysis.topics.slice(0, 3).join(', ')}`;
    output += `\n   Created: ${new Date(r.created_at).toLocaleString()}`;
    return output;
  });

  return {
    content: [{
      type: 'text',
      text: `Found ${results.length} memories:\n\n${formatted.join('\n\n')}`
    }]
  };
}

/**
 * Save a new memory
 */
async function saveMemory(env: Env, userId: string, args: any) {
  const { text, tag, context } = args;

  const memoryId = generateId('mem');
  const now = Date.now();

  // Generate embedding
  const embedding = await generateEmbedding(env, text);

  await env.DB.prepare(`
    INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    memoryId,
    userId,
    text,
    context ? JSON.stringify(context) : null,
    tag || null,
    'medium',
    embedding ? JSON.stringify(embedding) : null,
    now
  ).run();

  // Insert into Vectorize
  if (embedding && env.VECTORIZE) {
    await env.VECTORIZE.upsert([{
      id: memoryId,
      values: embedding,
      metadata: { user_id: userId, table: 'memory', type: tag || 'memory' }
    }]);
  }

  // Trigger AI analysis (inline - no waitUntil available in MCP handler)
  let analysisInfo = '';
  try {
    const analysis = await analyzeMemory(env, text, context || {});
    if (analysis) {
      const updatedContext = { ...(context || {}), analysis };
      await env.DB.prepare('UPDATE memory SET context_json = ? WHERE id = ?')
        .bind(JSON.stringify(updatedContext), memoryId)
        .run();
      analysisInfo = `\nCategory: ${analysis.category}\nPriority: ${analysis.actionPriority}\nTopics: ${analysis.topics?.slice(0, 3).join(', ') || 'none'}`;
    }
  } catch (err) {
    console.error('[MCP] Analysis failed:', err);
  }

  return {
    content: [{
      type: 'text',
      text: `Memory saved successfully!\nID: ${memoryId}\nTag: ${tag || 'none'}${analysisInfo}`
    }]
  };
}

/**
 * Save media (image/video) as memory with AI extraction
 */
async function saveMediaMemory(env: Env, userId: string, args: any) {
  const { url, type = 'image', note, tag } = args;

  if (!url) {
    return {
      content: [{ type: 'text', text: 'Error: URL is required' }],
      isError: true
    };
  }

  // Import and use media extractor
  const { extractFromImage, extractFromVideo } = await import('../utils/media-extractor');

  let extraction;
  if (type === 'video') {
    extraction = await extractFromVideo(url, env);
  } else {
    extraction = await extractFromImage(url, env);
  }

  if (!extraction) {
    return {
      content: [{ type: 'text', text: 'Error: Failed to extract content from media' }],
      isError: true
    };
  }

  // Build memory text
  const parts: string[] = [];
  if (extraction.text) parts.push(extraction.text);
  if (extraction.description) parts.push(extraction.description);
  if (note) parts.push(`Note: ${note}`);
  const memoryText = parts.join('\n\n').substring(0, 10000);

  if (!memoryText.trim()) {
    return {
      content: [{ type: 'text', text: 'Error: No content could be extracted from the media' }],
      isError: true
    };
  }

  const contextData: Record<string, any> = {
    media_url: url,
    media_type: type,
    extracted_type: extraction.mediaType,
    description: extraction.description,
    topics: extraction.topics,
    data: extraction.data,
  };
  if (note) contextData.user_note = note;
  if (extraction.text) contextData.extracted_text = extraction.text.substring(0, 5000);

  const memoryId = generateId('mem');
  const now = Date.now();
  const finalTag = tag || (type === 'video' ? 'video' : 'image');

  // Generate embedding
  const embedding = await generateEmbedding(env, memoryText);

  // Save to DB
  await env.DB.prepare(`
    INSERT INTO memory (id, user_id, text, context_json, tag, priority, embedding_vector, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    memoryId,
    userId,
    memoryText,
    JSON.stringify(contextData),
    finalTag,
    'medium',
    embedding ? JSON.stringify(embedding) : null,
    now
  ).run();

  // Insert into Vectorize
  if (embedding && env.VECTORIZE) {
    await env.VECTORIZE.upsert([{
      id: memoryId,
      values: embedding,
      metadata: { user_id: userId, table: 'memory', type: finalTag }
    }]);
  }

  // Run analysis
  let analysisInfo = '';
  try {
    const { analyzeMemory } = await import('../utils/memory-analyzer');
    const analysis = await analyzeMemory(env, memoryText, contextData);
    if (analysis) {
      const updatedContext = { ...contextData, analysis };
      await env.DB.prepare('UPDATE memory SET context_json = ? WHERE id = ?')
        .bind(JSON.stringify(updatedContext), memoryId)
        .run();
      analysisInfo = `\nCategory: ${analysis.category}\nTopics: ${analysis.topics?.slice(0, 5).join(', ') || 'none'}`;
    }
  } catch (err) {
    console.error('[MCP] Media analysis failed:', err);
  }

  return {
    content: [{
      type: 'text',
      text: `Media memory saved!\nID: ${memoryId}\nType: ${extraction.mediaType}\nDescription: ${extraction.description.substring(0, 200)}\nExtracted text: ${extraction.text ? extraction.text.substring(0, 200) + '...' : 'none'}\nTopics: ${extraction.topics.join(', ') || 'none'}${analysisInfo}`
    }]
  };
}

/**
 * List memories
 */
async function listMemories(env: Env, userId: string, args: any) {
  const { limit = 20, tag, offset = 0 } = args;

  let query = 'SELECT id, text, context_json, tag, created_at FROM memory WHERE user_id = ?';
  const bindings: any[] = [userId];

  if (tag) {
    query += ' AND tag = ?';
    bindings.push(tag);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...bindings).all();
  const memories = result.results || [];

  if (memories.length === 0) {
    return {
      content: [{ type: 'text', text: 'No memories found.' }]
    };
  }

  const formatted = memories.map((m: any, i: number) => {
    const context = m.context_json ? JSON.parse(m.context_json) : {};
    const title = context.title || context.extractedTitle || '';

    let output = `${i + 1}. [${m.id}]`;
    if (title) output += ` - ${title}`;
    output += `\n   ${m.text.substring(0, 150)}${m.text.length > 150 ? '...' : ''}`;
    if (m.tag) output += `\n   Tag: ${m.tag}`;
    return output;
  });

  return {
    content: [{
      type: 'text',
      text: `Recent memories (${memories.length}):\n\n${formatted.join('\n\n')}`
    }]
  };
}

/**
 * Get specific memory
 */
async function getMemory(env: Env, userId: string, args: any) {
  const { id } = args;

  const memory = await env.DB.prepare(
    'SELECT * FROM memory WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!memory) {
    return {
      content: [{ type: 'text', text: `Memory ${id} not found.` }],
      isError: true
    };
  }

  const context = memory.context_json ? JSON.parse(memory.context_json as string) : {};

  let output = `Memory: ${memory.id}\n${'='.repeat(50)}\n\n`;
  if (context.title || context.extractedTitle) {
    output += `Title: ${context.title || context.extractedTitle}\n`;
  }
  output += `Content:\n${memory.text}\n\n`;
  if (memory.tag) output += `Tag: ${memory.tag}\n`;
  if (memory.priority) output += `Priority: ${memory.priority}\n`;
  output += `Created: ${new Date(memory.created_at as number).toLocaleString()}\n`;
  if (Object.keys(context).length > 0) {
    output += `\nMetadata:\n${JSON.stringify(context, null, 2)}`;
  }

  return {
    content: [{ type: 'text', text: output }]
  };
}

/**
 * Delete memory
 */
async function deleteMemory(env: Env, userId: string, args: any) {
  const { id } = args;

  const result = await env.DB.prepare(
    'DELETE FROM memory WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run();

  if (result.meta.changes === 0) {
    return {
      content: [{ type: 'text', text: `Memory ${id} not found.` }],
      isError: true
    };
  }

  // Delete from Vectorize
  if (env.VECTORIZE) {
    try {
      await env.VECTORIZE.deleteByIds([id]);
    } catch (e) {
      console.error('[MCP] Failed to delete from Vectorize:', e);
    }
  }

  return {
    content: [{ type: 'text', text: `Memory ${id} deleted successfully.` }]
  };
}

/**
 * Find items related to a specific memory or post using vector similarity
 */
async function findRelated(env: Env, args: any) {
  const { id, limit = 5 } = args;

  // Get embedding from memory or posts table
  let embedding: string | null = null;

  const memItem = await env.DB.prepare(
    'SELECT embedding_vector FROM memory WHERE id = ?'
  ).bind(id).first<{ embedding_vector: string }>();

  if (memItem?.embedding_vector) {
    embedding = memItem.embedding_vector;
  } else {
    const postItem = await env.DB.prepare(
      'SELECT embedding_vector FROM posts WHERE id = ?'
    ).bind(id).first<{ embedding_vector: string }>();
    if (postItem?.embedding_vector) {
      embedding = postItem.embedding_vector;
    }
  }

  if (!embedding || !env.VECTORIZE) {
    return {
      content: [{ type: 'text', text: 'No embedding found for this item or Vectorize unavailable.' }]
    };
  }

  const embeddingVector = JSON.parse(embedding);
  const vectorResults = await env.VECTORIZE.query(embeddingVector, {
    topK: limit + 1,
    returnMetadata: 'all'
  });

  const filtered = vectorResults.matches
    .filter(m => m.id !== id)
    .slice(0, limit);

  if (filtered.length === 0) {
    return {
      content: [{ type: 'text', text: 'No related items found.' }]
    };
  }

  const results: string[] = [];
  for (const match of filtered) {
    const meta = match.metadata as any;
    const table = meta?.table || 'memory';

    let item: any = null;
    if (table === 'posts') {
      item = await env.DB.prepare(
        'SELECT id, type, original_text, context_json, created_at FROM posts WHERE id = ?'
      ).bind(match.id).first();
    } else {
      item = await env.DB.prepare(
        'SELECT id, text, context_json, tag, created_at FROM memory WHERE id = ?'
      ).bind(match.id).first();
    }

    if (item) {
      const ctx = item.context_json ? JSON.parse(item.context_json) : {};
      const title = ctx.title || (item.text || item.original_text || '').substring(0, 80);
      const score = Math.round(match.score * 100);
      const type = item.type || item.tag || 'memory';
      results.push(`[${item.id}] ${score}% match | ${type} | ${title}`);
    }
  }

  return {
    content: [{
      type: 'text',
      text: `Related items for ${id}:\n\n${results.join('\n')}`
    }]
  };
}

/**
 * Get aggregated insights from the knowledge base
 */
async function getInsights(env: Env, args: any) {
  const { focus = 'overview', days_back } = args;

  let dateFilter = '';
  const bindings: any[] = [];
  if (days_back) {
    const cutoff = Date.now() - (days_back * 86400000);
    dateFilter = ' AND created_at >= ?';
    bindings.push(cutoff);
  }

  // Fetch analyzed items from both tables
  const [memResults, postResults] = await Promise.all([
    env.DB.prepare(
      `SELECT id, text, context_json, tag, created_at FROM memory WHERE context_json LIKE '%"analysis":%'${dateFilter}`
    ).bind(...bindings).all(),
    env.DB.prepare(
      `SELECT id, original_text as text, context_json, type as tag, created_at FROM posts WHERE context_json LIKE '%"analysis":%'${dateFilter}`
    ).bind(...bindings).all()
  ]);

  const allItems = [...(memResults.results || []), ...(postResults.results || [])] as any[];

  const categories: Record<string, number> = {};
  const topics: Record<string, number> = {};
  const highPriority: any[] = [];

  for (const item of allItems) {
    try {
      const ctx = JSON.parse(item.context_json);
      const a = ctx.analysis;
      if (!a) continue;

      if (a.category) categories[a.category] = (categories[a.category] || 0) + 1;
      for (const t of a.topics || []) {
        topics[t] = (topics[t] || 0) + 1;
      }
      if (a.actionPriority === 'high') {
        highPriority.push({
          id: item.id,
          title: ctx.title || item.text?.substring(0, 80),
          category: a.category,
          topics: a.topics?.slice(0, 3)
        });
      }
    } catch { /* skip */ }
  }

  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const sortedTopics = Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 15);

  let output = `Knowledge Base Insights${days_back ? ` (last ${days_back} days)` : ''}:\n`;
  output += `Total analyzed: ${allItems.length}\n\n`;

  if (focus === 'overview' || focus === 'categories') {
    output += `Categories:\n${sortedCategories.map(([c, n]) => `  ${c}: ${n}`).join('\n')}\n\n`;
  }

  if (focus === 'overview' || focus === 'topics') {
    output += `Top Topics:\n${sortedTopics.map(([t, n]) => `  ${t}: ${n}`).join('\n')}\n\n`;
  }

  if (focus === 'overview' || focus === 'high_priority') {
    output += `High Priority (${highPriority.length}):\n`;
    for (const hp of highPriority.slice(0, 10)) {
      output += `  [${hp.id}] ${hp.title}`;
      if (hp.category) output += ` (${hp.category})`;
      output += '\n';
    }
  }

  return {
    content: [{ type: 'text', text: output }]
  };
}

/**
 * List resources (recent memories)
 */
async function handleListResources(env: Env, userId: string) {
  const result = await env.DB.prepare(
    'SELECT id, text, tag, created_at FROM memory WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(userId).all();

  const memories = result.results || [];

  return {
    resources: memories.map((m: any) => ({
      uri: `memory://${m.id}`,
      name: m.text.substring(0, 100) + (m.text.length > 100 ? '...' : ''),
      description: `Tag: ${m.tag || 'none'} | Created: ${new Date(m.created_at).toISOString()}`,
      mimeType: 'application/json'
    }))
  };
}

/**
 * Read a specific resource
 */
async function handleReadResource(env: Env, userId: string, params: any) {
  const { uri } = params;
  const match = uri.match(/^memory:\/\/(.+)$/);

  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const memoryId = match[1];
  const memory = await env.DB.prepare(
    'SELECT * FROM memory WHERE id = ? AND user_id = ?'
  ).bind(memoryId, userId).first();

  if (!memory) {
    throw new Error(`Memory ${memoryId} not found`);
  }

  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(memory, null, 2)
    }]
  };
}

export default mcp;
