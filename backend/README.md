# My Memory - Backend API

Cloudflare Workers backend for the My Memory personal content management system.

## Architecture

- **Runtime**: Cloudflare Workers (Edge computing)
- **Framework**: Hono
- **Database**: D1 (SQLite at edge)
- **Vector DB**: Vectorize (semantic search)
- **AI**: Workers AI (embeddings)
- **Cache**: KV Namespaces
- **Storage**: R2 (object storage)
- **Language**: TypeScript

## Infrastructure Bindings

| Binding | Resource | Purpose |
|---------|----------|---------|
| `DB` | D1 text-processor-db | Main database |
| `VECTORIZE` | my-memory-index | Vector embeddings (768d) |
| `AI` | Workers AI | Embedding generation |
| `CACHE` | KV | Response caching |
| `SESSIONS` | KV | Session management |
| `STORAGE` | R2 | File storage |
| `HTML_TO_IMAGE_SERVICE` | Worker | Screenshot generation |
| `TRANSCRIPT_SERVICE` | Worker | YouTube transcripts |

## Setup

```bash
cd backend
npm install
npx wrangler login
npm run deploy
```

## Development

```bash
npm run dev          # Local dev (localhost:8787)
npm run deploy       # Deploy to production
npm run tail         # Watch logs
npm run d1:migrate   # Run migrations
```

## API Routes

### Dashboard (`/dashboard/`)
Server-rendered pages with 17 template files.

### Memory (`/api/memory/`)
- `POST /` - Save memory with embeddings
- `GET /` - List memories
- `DELETE /:id` - Delete memory

### Search (`/api/search/`)
- `POST /semantic` - Vectorize semantic search
- `POST /keyword` - Keyword search fallback
- `GET /recent` - Recent items with filters

### Chat (`/api/chat/`)
- `POST /` - RAG chat with memories
- `GET /history` - Conversation history

### Tasks (`/api/tasks/`)
- `GET /` - List tasks
- `POST /` - Create task
- `PATCH /:id` - Update task
- `POST /:id/conversation` - Task thread

### Webhook (`/api/v1/webhook`)
- `POST /` - Receive events (tweets, videos, urls)

### Admin (`/api/admin/`)
- `POST /migrate-vectors` - Vector migration

## Route Files (18 total)

| File | Purpose |
|------|---------|
| admin.ts | Migration & admin endpoints |
| airtable.ts | Airtable integration |
| auth.ts | JWT authentication |
| chat.ts | Chat/RAG with memories |
| claude-sessions.ts | Session tracking |
| dashboard.ts | Dashboard routing |
| export.ts | Data export |
| memory.ts | Memory CRUD |
| mobile.ts | Mobile endpoints |
| posts.ts | Posts management |
| process.ts | Text/image processing |
| proxy.ts | External API proxy |
| search.ts | Semantic & keyword search |
| settings.ts | User settings |
| tasks.ts | Task management |
| ui.ts | UI components |
| visual-content.ts | Visual generation |
| webhook.ts | Webhook handling |

## Database Tables

```sql
users, posts, memory, sessions, settings,
webhook_events, tasks, task_conversations, chat_history
```

## Performance

- Cold Start: 14-19ms
- API Response: <200ms
- Vectorize Query: <50ms

## Deployed URLs

- **Backend**: https://my-memory.kureckamichal.workers.dev
- **Custom Domain**: memory.michalkurecka.cz
