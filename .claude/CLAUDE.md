# My Memory - Technical Reference

## Project Overview

Personal memory and content management system with browser extension, Cloudflare Workers backend, and AI-powered semantic search.

**Repository**: https://github.com/mkurecka/x-post-sender
**Deployed Backend**: https://my-memory.kureckamichal.workers.dev
**Custom Domain**: memory.michalkurecka.cz
**Extension ID**: epjggaaoglehneiflbfpkfghikblkjom

## Architecture

### Monorepo Structure

```
my-memory/
├── backend/              # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts                 # Main Hono app, CORS, routes
│   │   ├── routes/                  # API route handlers (18 files)
│   │   │   ├── admin.ts             # Admin & migration endpoints
│   │   │   ├── airtable.ts          # Airtable integration
│   │   │   ├── auth.ts              # JWT authentication
│   │   │   ├── chat.ts              # Chat/RAG with memories
│   │   │   ├── claude-sessions.ts   # Claude Code session tracking
│   │   │   ├── dashboard.ts         # Dashboard page routing
│   │   │   ├── export.ts            # Data export endpoints
│   │   │   ├── memory.ts            # Memory storage endpoints
│   │   │   ├── mobile.ts            # Mobile-optimized endpoints
│   │   │   ├── posts.ts             # Posts management
│   │   │   ├── process.ts           # Text/image processing
│   │   │   ├── proxy.ts             # External API proxy
│   │   │   ├── search.ts            # Semantic & keyword search
│   │   │   ├── settings.ts          # User settings
│   │   │   ├── tasks.ts             # Task management
│   │   │   ├── ui.ts                # UI components
│   │   │   ├── visual-content.ts    # Visual content generation
│   │   │   └── webhook.ts           # Webhook handling
│   │   ├── templates/
│   │   │   ├── layout.ts            # Base HTML layout
│   │   │   └── pages/               # Dashboard pages (17 files)
│   │   │       ├── add-content.ts   # Add memory/tweet/video/url
│   │   │       ├── ai-content.ts    # AI-generated content
│   │   │       ├── ai-images.ts     # AI image gallery
│   │   │       ├── all-content.ts   # All content view
│   │   │       ├── chat.ts          # Chat with memories
│   │   │       ├── claude-sessions.ts # Session history
│   │   │       ├── dashboard.ts     # Main dashboard
│   │   │       ├── generate-carousel.ts # Carousel generator
│   │   │       ├── generate-image.ts # Image generator
│   │   │       ├── memories.ts      # Memories list
│   │   │       ├── memories-unified.ts # Unified view
│   │   │       ├── profiles.ts      # Brand profiles
│   │   │       ├── settings.ts      # Settings page
│   │   │       ├── tasks.ts         # Task management
│   │   │       ├── tweets.ts        # Saved tweets
│   │   │       ├── videos.ts        # Saved videos
│   │   │       └── webhooks.ts      # Webhook config
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   └── utils/
│   │       ├── crypto.ts            # Encryption utilities
│   │       ├── embeddings.ts        # Vector embeddings & search
│   │       ├── id.ts                # ID generation
│   │       └── jwt.ts               # JWT utilities
│   ├── migrations/                  # D1 database migrations
│   ├── wrangler.toml                # Cloudflare configuration
│   └── package.json                 # Dependencies
│
└── extension/            # Chrome Extension (Manifest V3)
    ├── background.js             # Service worker
    ├── content.js                # FAB, text selection, UI
    ├── api-client.js             # Backend API communication
    ├── settings-manager.js       # Settings management
    └── manifest.json             # Extension configuration
```

## Backend (Cloudflare Workers)

### Tech Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Hono v4.7.11
- **Language**: TypeScript 5.7.3
- **Database**: D1 (SQLite at edge)
- **Vector DB**: Vectorize (semantic search)
- **AI**: Workers AI (embeddings)
- **Cache**: KV Namespaces
- **Storage**: R2 (object storage)
- **Auth**: JWT with jose

### Infrastructure Resources

| Resource | Binding | Purpose |
|----------|---------|---------|
| D1 Database | `DB` | Main data storage |
| Vectorize | `VECTORIZE` | Vector embeddings for semantic search |
| Workers AI | `AI` | Embedding generation (bge-base-en-v1.5) |
| KV CACHE | `CACHE` | Response caching, rate limiting |
| KV SESSIONS | `SESSIONS` | Session management |
| R2 Bucket | `STORAGE` | File uploads, images |
| HTML Service | `HTML_TO_IMAGE_SERVICE` | Screenshot generation |
| Transcript Service | `TRANSCRIPT_SERVICE` | YouTube transcript extraction |

### Database Tables

```sql
users           # User accounts, auth
posts           # Processed texts, drafts, saved content
memory          # Saved memories with tags & embeddings
sessions        # User sessions
settings        # User preferences
webhook_events  # Received webhook data
tasks           # Task management
task_conversations # Task conversation threads
chat_history    # Chat with memories history
```

### API Endpoints

**Base URL**: `https://my-memory.kureckamichal.workers.dev`

**Dashboard** (`/dashboard/`)
- `GET /` - Main dashboard
- `GET /memories` - Memory list with type filters
- `GET /add` - Add content (memory, tweet, video, url)
- `GET /chat` - Chat with memories (RAG)
- `GET /tasks` - Task management
- `GET /all-content` - All saved content
- `GET /settings` - User settings

**Memory** (`/api/memory/`)
- `POST /` - Save to memory with embeddings
- `GET /` - List memories
- `DELETE /:id` - Delete memory

**Search** (`/api/search/`)
- `POST /semantic` - Vectorize-powered semantic search
- `POST /keyword` - Keyword search fallback
- `GET /recent` - Recent items with filters (`?q=`, `?tag=`)

**Chat** (`/api/chat/`)
- `POST /` - Chat with memories (RAG pattern)
- `GET /history` - Conversation history

**Tasks** (`/api/tasks/`)
- `GET /` - List tasks
- `POST /` - Create task
- `PATCH /:id` - Update task
- `POST /:id/conversation` - Add to task thread

**Webhook** (`/api/v1/webhook`)
- `POST /` - Receive external events (tweets, videos, urls)

**Admin** (`/api/admin/`)
- `POST /migrate-vectors` - Migrate embeddings to Vectorize

**MCP** (`/mcp`)
- `GET /` - Server info (discovery)
- `POST /` - JSON-RPC endpoint for MCP protocol

### MCP Server (Model Context Protocol)

The backend includes an MCP server for Claude Desktop/Code integration.

**Endpoint**: `https://my-memory.kureckamichal.workers.dev/mcp`

#### Available Tools

| Tool | Description |
|------|-------------|
| `search_memory` | Semantic search through saved memories |
| `save_memory` | Save new content to memory |
| `list_memories` | List recent memories with optional filters |
| `get_memory` | Get specific memory by ID |
| `delete_memory` | Delete a memory by ID |

#### Authentication

API key via header or query parameter:
- **Header**: `Authorization: Bearer mm_your_api_key`
- **Query param**: `?key=mm_your_api_key` (for Claude.ai custom connectors)

#### Connect via Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
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
  }
}
```

#### Connect via Claude.ai Custom Connector

1. Go to Claude.ai Settings → Connected apps → Add more
2. Select "Custom Connector"
3. Enter URL: `https://my-memory.kureckamichal.workers.dev/mcp?key=mm_your_api_key`
4. Connect

### CORS Configuration

```typescript
origin: (origin) => {
  if (!origin) return '*';
  if (origin.startsWith('chrome-extension://')) return origin;
  if (origin.startsWith('file://')) return origin;
  return origin;
}
```

### Deployment

```bash
cd backend
npm install
npm run deploy   # Deploy to Cloudflare
npm run dev      # Local development
npm run tail     # Watch logs
```

## Key Features

### Semantic Search (Vectorize)
- Uses Cloudflare Vectorize for vector storage
- Workers AI `bge-base-en-v1.5` model (768 dimensions)
- Fast cosine similarity search at edge
- Filters by user, content type

### Chat/RAG
- Query memories using natural language
- Retrieves relevant context via semantic search
- Generates AI responses with memory citations
- Conversation history persistence

### Content Types
- **Memory**: Text snippets with tags
- **Tweet**: Saved tweets with metadata
- **Video**: YouTube videos with transcripts
- **URL/Link**: Web pages with auto-enrichment

### Type Filtering
- Filter memories by type: link, video, tweet
- Auto-detection based on content and context
- Visual badges in UI

### URL Auto-Enrichment
- Automatic metadata extraction for saved URLs
- Title, description, favicon fetching
- Integration with proxy endpoints

## Extension (Chrome Manifest V3)

### Features
- FAB (Floating Action Button) for quick access
- Text selection → Save to memory
- Image processing with AI
- Settings management
- Offline storage with IndexedDB

### Service Worker
- Message handling from content script
- OpenRouter API calls
- Webhook delivery
- Settings sync

## Development

### Backend Commands
```bash
npm run dev          # Local dev (localhost:8787)
npm run deploy       # Deploy to production
npm run tail         # Watch logs
npm run d1:migrate   # Run migrations
```

### Database Commands
```bash
npx wrangler d1 execute text-processor-db --command "SELECT * FROM memory LIMIT 10"
npx wrangler d1 migrations apply text-processor-db --remote
```

### Extension Development
```bash
cd extension
npm run check   # Type check + lint (REQUIRED before commit)
npm run lint    # ESLint only
```

## File Size Rules

- **Maximum file**: 500 lines per file
- **Refactor** if file exceeds 400 lines
- **Single responsibility**: One domain per handler

## Security

- JWT authentication
- API key validation
- Input sanitization
- Rate limiting via KV
- CORS restrictions
- Cloudflare Access protection on dashboard

## Performance

- **Cold Start**: 14-19ms
- **API Response**: <200ms
- **Vectorize Query**: <50ms
- **Global Edge**: 300+ cities

---

**Last Updated**: 2025-12-31
**Status**: ✅ Production Ready
