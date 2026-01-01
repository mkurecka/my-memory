# My Memory MCP Server

MCP (Model Context Protocol) server that connects Claude to your My Memory system. Enables semantic search through your saved memories, URLs, tweets, and videos directly from Claude.

## Features

- **search_memory** - Semantic search through all saved memories using natural language
- **save_memory** - Save new content to memory (URLs are auto-enriched)
- **list_memories** - Browse recent memories with filtering
- **get_memory** - View full details of a specific memory
- **delete_memory** - Remove memories

## Installation

### 1. Build the server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Get your API key

Generate a permanent API key (doesn't expire like JWT tokens):

**Option A: Via API (using existing JWT token)**
```bash
# First login to get a JWT token
curl -X POST https://my-memory.kureckamichal.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# Then generate API key using that token
curl -X POST https://my-memory.kureckamichal.workers.dev/api/auth/api-key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Option B: Via Dashboard** (coming soon)
1. Go to your My Memory dashboard: https://memory.michalkurecka.cz/dashboard/settings
2. Click "Generate API Key"

The API key starts with `mm_` and never expires. Store it securely!

### 3. Configure Claude Code

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "my-memory": {
      "command": "node",
      "args": ["/path/to/my-memory/mcp-server/dist/index.js"],
      "env": {
        "MY_MEMORY_API_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

Or using npx after publishing:

```json
{
  "mcpServers": {
    "my-memory": {
      "command": "npx",
      "args": ["my-memory-mcp"],
      "env": {
        "MY_MEMORY_API_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

### 4. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "my-memory": {
      "command": "node",
      "args": ["/absolute/path/to/my-memory/mcp-server/dist/index.js"],
      "env": {
        "MY_MEMORY_API_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MY_MEMORY_API_TOKEN` | Yes | JWT token for authentication |
| `MY_MEMORY_API_URL` | No | Custom API URL (default: https://my-memory.kureckamichal.workers.dev) |

## Usage Examples

Once configured, you can use these tools in Claude:

### Search for saved content

> "Search my memory for articles about TypeScript best practices"

### Save a URL

> "Save this URL to my memory: https://example.com/interesting-article"

### List recent memories

> "Show me my recent saved links"

### Get specific memory

> "Get the details for memory ID abc123"

## Tool Reference

### search_memory

Search through saved memories using semantic/vector search.

**Parameters:**
- `query` (required): Natural language search query
- `limit` (optional): Max results, default 10
- `tag` (optional): Filter by tag ('link', 'video', 'tweet', or custom)

### save_memory

Save content to memory with auto-enrichment for URLs.

**Parameters:**
- `text` (required): Content to save (URL or text)
- `tag` (optional): Category tag
- `context` (optional): Additional metadata object

### list_memories

List recent memories with pagination.

**Parameters:**
- `limit` (optional): Max results, default 20
- `offset` (optional): Pagination offset
- `tag` (optional): Filter by tag

### get_memory

Get full details of a specific memory.

**Parameters:**
- `id` (required): Memory ID

### delete_memory

Delete a memory.

**Parameters:**
- `id` (required): Memory ID to delete

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run directly
MY_MEMORY_API_TOKEN=xxx node dist/index.js
```

## Troubleshooting

### Token issues

If you get authentication errors:
1. Verify your token is valid and not expired
2. Tokens expire after 24 hours - generate a new one from settings
3. Make sure the token is properly set in the environment

### Connection issues

If the server won't start:
1. Check that the API URL is accessible
2. Verify network connectivity
3. Check for any firewall blocking

## License

MIT
