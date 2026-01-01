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

const mcp = new Hono<{ Bindings: Env }>();

// MCP Protocol version
const MCP_VERSION = '2024-11-05';

/**
 * Extract user ID from auth header if present
 */
async function getUserFromAuth(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');

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

    case 'tools/call':
      // Tool calls require authentication
      if (!userId) {
        const error = new Error('Authentication required. Provide API key via Authorization header.');
        (error as any).code = -32001;
        throw error;
      }
      return handleToolCall(env, userId, params);

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
        description: 'Search through saved memories using semantic search. Use this to find relevant information from previously saved content including URLs, tweets, videos, and notes.',
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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Search memories using semantic search
 */
async function searchMemory(env: Env, userId: string, args: any) {
  const { query, limit = 10, tag } = args;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(env, query);
  if (!queryEmbedding) {
    return {
      content: [{ type: 'text', text: 'Error: Failed to generate search embedding' }],
      isError: true
    };
  }

  // Search using Vectorize
  const vectorResults = await vectorSearch(env, queryEmbedding, userId, {
    topK: limit,
    minScore: 0.5,
    table: 'memory'
  });

  if (vectorResults.length === 0) {
    return {
      content: [{ type: 'text', text: 'No matching memories found.' }]
    };
  }

  // Fetch full records
  const ids = vectorResults.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const dbResults = await env.DB.prepare(
    `SELECT id, text, context_json, tag, created_at FROM memory WHERE id IN (${placeholders})`
  ).bind(...ids).all();

  // Merge with scores
  const resultsMap = new Map((dbResults.results || []).map((r: any) => [r.id, r]));
  let results = vectorResults.map(vr => ({
    ...resultsMap.get(vr.id),
    similarity: vr.score
  })).filter(r => r.id);

  // Filter by tag if specified
  if (tag) {
    results = results.filter(r => r.tag === tag);
  }

  // Format results
  const formatted = results.map((r: any, i: number) => {
    const context = r.context_json ? JSON.parse(r.context_json) : {};
    const title = context.title || context.extractedTitle || '';
    const similarity = r.similarity ? ` (${(r.similarity * 100).toFixed(1)}% match)` : '';

    let output = `${i + 1}. [${r.id}]${similarity}`;
    if (title) output += `\n   Title: ${title}`;
    output += `\n   Content: ${r.text.substring(0, 200)}${r.text.length > 200 ? '...' : ''}`;
    if (r.tag) output += `\n   Tag: ${r.tag}`;
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

  return {
    content: [{
      type: 'text',
      text: `Memory saved successfully!\nID: ${memoryId}\nTag: ${tag || 'none'}`
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
