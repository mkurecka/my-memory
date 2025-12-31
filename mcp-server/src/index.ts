#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MemoryClient } from "./memory-client.js";

const API_URL = process.env.MY_MEMORY_API_URL || "https://my-memory.kureckamichal.workers.dev";
const API_TOKEN = process.env.MY_MEMORY_API_TOKEN;

if (!API_TOKEN) {
  console.error("Error: MY_MEMORY_API_TOKEN environment variable is required");
  console.error("Get your token from your My Memory settings page");
  process.exit(1);
}

const client = new MemoryClient(API_URL, API_TOKEN);

const server = new Server(
  {
    name: "my-memory-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_memory",
        description:
          "Search through saved memories using semantic search. Use this to find relevant information from previously saved content including URLs, tweets, videos, and notes.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query - natural language works best for semantic search",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 10)",
            },
            tag: {
              type: "string",
              description: "Filter by tag: 'link', 'video', 'tweet', or custom tag",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "save_memory",
        description:
          "Save content to memory. Can save text notes, URLs (auto-enriched with metadata), or any content you want to remember later. URLs are automatically detected and enriched with title, description, and content.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The content to save - can be a URL or text note",
            },
            tag: {
              type: "string",
              description: "Optional tag to categorize: 'link', 'video', 'tweet', or custom",
            },
            context: {
              type: "object",
              description: "Optional metadata to attach to the memory",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "list_memories",
        description:
          "List recent memories with optional filtering by tag or type. Returns the most recent saved items.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of results (default: 20)",
            },
            tag: {
              type: "string",
              description: "Filter by tag: 'link', 'video', 'tweet', or custom",
            },
            offset: {
              type: "number",
              description: "Pagination offset (default: 0)",
            },
          },
        },
      },
      {
        name: "get_memory",
        description: "Get a specific memory by its ID to see full details and context.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The memory ID to retrieve",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_memory",
        description: "Delete a specific memory by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The memory ID to delete",
            },
          },
          required: ["id"],
        },
      },
    ],
  };
});

// List resources (recent memories as resources)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const memories = await client.listMemories({ limit: 20 });
    return {
      resources: memories.map((m) => ({
        uri: `memory://${m.id}`,
        name: m.text.substring(0, 100) + (m.text.length > 100 ? "..." : ""),
        description: `Tag: ${m.tag || "none"} | Created: ${new Date(m.created_at).toISOString()}`,
        mimeType: "application/json",
      })),
    };
  } catch (error) {
    return { resources: [] };
  }
});

// Read a specific resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^memory:\/\/(.+)$/);

  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const memoryId = match[1];
  const memory = await client.getMemory(memoryId);

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(memory, null, 2),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_memory": {
        const { query, limit = 10, tag } = args as {
          query: string;
          limit?: number;
          tag?: string;
        };
        const results = await client.searchMemories(query, { limit, tag });
        return {
          content: [
            {
              type: "text",
              text: formatSearchResults(results),
            },
          ],
        };
      }

      case "save_memory": {
        const { text, tag, context } = args as {
          text: string;
          tag?: string;
          context?: Record<string, unknown>;
        };
        const result = await client.saveMemory(text, { tag, context });
        return {
          content: [
            {
              type: "text",
              text: `Memory saved successfully!\nID: ${result.memoryId}\nType: ${result.type || "text"}\nEnriched: ${result.enriched ? "Yes" : "No"}`,
            },
          ],
        };
      }

      case "list_memories": {
        const { limit = 20, tag, offset = 0 } = args as {
          limit?: number;
          tag?: string;
          offset?: number;
        };
        const memories = await client.listMemories({ limit, tag, offset });
        return {
          content: [
            {
              type: "text",
              text: formatMemoryList(memories),
            },
          ],
        };
      }

      case "get_memory": {
        const { id } = args as { id: string };
        const memory = await client.getMemory(id);
        return {
          content: [
            {
              type: "text",
              text: formatMemoryDetail(memory),
            },
          ],
        };
      }

      case "delete_memory": {
        const { id } = args as { id: string };
        await client.deleteMemory(id);
        return {
          content: [
            {
              type: "text",
              text: `Memory ${id} deleted successfully.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Formatting helpers
function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No matching memories found.";
  }

  const formatted = results.map((r, i) => {
    const context = r.context_json ? JSON.parse(r.context_json) : {};
    const title = context.title || context.extractedTitle || "";
    const similarity = r.similarity ? ` (${(r.similarity * 100).toFixed(1)}% match)` : "";

    let output = `${i + 1}. [${r.id}]${similarity}`;
    if (title) output += `\n   Title: ${title}`;
    output += `\n   Content: ${r.text.substring(0, 200)}${r.text.length > 200 ? "..." : ""}`;
    if (r.tag) output += `\n   Tag: ${r.tag}`;
    output += `\n   Created: ${new Date(r.created_at).toLocaleString()}`;
    return output;
  });

  return `Found ${results.length} memories:\n\n${formatted.join("\n\n")}`;
}

function formatMemoryList(memories: Memory[]): string {
  if (memories.length === 0) {
    return "No memories found.";
  }

  const formatted = memories.map((m, i) => {
    const context = m.context_json ? JSON.parse(m.context_json) : {};
    const title = context.title || context.extractedTitle || "";

    let output = `${i + 1}. [${m.id}]`;
    if (title) output += ` - ${title}`;
    output += `\n   ${m.text.substring(0, 150)}${m.text.length > 150 ? "..." : ""}`;
    if (m.tag) output += `\n   Tag: ${m.tag}`;
    return output;
  });

  return `Recent memories (${memories.length}):\n\n${formatted.join("\n\n")}`;
}

function formatMemoryDetail(memory: Memory): string {
  const context = memory.context_json ? JSON.parse(memory.context_json) : {};

  let output = `Memory: ${memory.id}\n`;
  output += `${"=".repeat(50)}\n\n`;

  if (context.title || context.extractedTitle) {
    output += `Title: ${context.title || context.extractedTitle}\n`;
  }

  output += `Content:\n${memory.text}\n\n`;

  if (memory.tag) output += `Tag: ${memory.tag}\n`;
  if (memory.priority) output += `Priority: ${memory.priority}\n`;
  output += `Created: ${new Date(memory.created_at).toLocaleString()}\n`;

  if (Object.keys(context).length > 0) {
    output += `\nMetadata:\n${JSON.stringify(context, null, 2)}`;
  }

  return output;
}

// Type definitions
interface Memory {
  id: string;
  user_id: string;
  text: string;
  context_json: string | null;
  tag: string | null;
  priority: string | null;
  created_at: number;
}

interface SearchResult extends Memory {
  similarity?: number;
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("My Memory MCP server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
