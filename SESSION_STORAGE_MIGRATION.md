# Migrating Session Storage to My-Memory

Session storage tools (`save_session`, `search_sessions`, `get_session`, `list_projects`) have been consolidated into the my-memory worker. This gives you semantic search (Vectorize) instead of basic FTS5.

## What Changed

- **Old**: Separate `session-storage` worker with its own D1 + FTS5
- **New**: Same 4 tools, now served by `my-memory` MCP server with Vectorize semantic search

Tool names and schemas are identical — no changes needed in your workflows.

## Migration Steps

### 1. Remove old MCP server

In `~/.claude/.mcp.json`, delete the `session-storage` entry:

```diff
- "session-storage": {
-   "command": "npx",
-   "args": ["-y", "@anthropic-ai/mcp-remote", "https://session-storage.kureckamichal.workers.dev/mcp"],
-   "env": {
-     "MCP_HEADERS": "{\"Authorization\":\"Bearer YOUR_KEY\"}"
-   }
- },
```

### 2. Ensure my-memory MCP is configured

In `~/.claude.json` (or `~/.claude/.mcp.json`), verify you have:

```json
"my-memory": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "https://my-memory.kureckamichal.workers.dev/mcp",
    "--header",
    "Authorization:Bearer mm_your_api_key",
    "--transport",
    "http-first"
  ]
}
```

### 3. Migrate existing sessions (optional)

Export sessions from the old D1 database and POST them to the new endpoint. Each POST auto-generates a semantic embedding.

```bash
# Export from old D1 (replace DB_ID with your session-storage database ID)
CLOUDFLARE_API_TOKEN=xxx curl -s \
  "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/d1/database/DB_ID/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM sessions ORDER BY created_at"}' \
  -o old_sessions.json

# Import to new system (one per session)
curl -s https://my-memory.kureckamichal.workers.dev/api/work-sessions \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "project": "my-project",
    "goal": "Session goal here",
    "summary": "What was accomplished",
    "changes": ["file1.ts", "file2.ts"],
    "errors": ["error description"],
    "open_items": ["unfinished work"],
    "tags": ["tag1", "tag2"],
    "verified": true
  }'
```

Note: The old worker stored `changes`, `errors`, `open_items`, and `tags` as JSON strings. The new API expects actual arrays — parse them before posting.

### 4. Update command references

In `/start-session` and `/end-session` commands, update any mention of "session-storage server" to "my-memory MCP server".

### 5. Restart Claude Code

Restart your Claude Code session so the MCP server list refreshes.

### 6. Verify

```bash
# Should list session tools alongside memory tools
curl -s https://my-memory.kureckamichal.workers.dev/mcp \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | grep '"name"'
```

Expected output includes: `search_memory`, `save_memory`, `list_memories`, `get_memory`, `delete_memory`, `save_session`, `search_sessions`, `get_session`, `list_projects`.

### 7. Delete old worker (when ready)

```bash
CLOUDFLARE_API_TOKEN=xxx npx wrangler delete session-storage
```

## API Differences

| Feature | Old (session-storage) | New (my-memory) |
|---------|----------------------|-----------------|
| Search | FTS5 full-text | Vectorize semantic + LIKE fallback |
| Auth | Bearer token required | Session tools work without auth |
| Timestamps | ISO strings | Integer (epoch ms) |
| ID format | 12-char random | `ws_` + UUID |
| REST API | None | `GET/POST /api/work-sessions` |
