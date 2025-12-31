# My Memory

Personal memory and content management system with AI-powered semantic search.

## Features

- **Memory Storage** - Save text, URLs, tweets, and videos
- **Semantic Search** - Find content using natural language via Vectorize
- **Chat with Memories** - RAG-powered conversations with your saved content
- **Task Management** - Track tasks with AI assistance
- **Chrome Extension** - Quick capture from any webpage

## Architecture

```
my-memory/
├── backend/         # Cloudflare Workers API
│   ├── src/
│   │   ├── routes/      # 18 API route handlers
│   │   └── templates/   # 17 dashboard pages
│   └── wrangler.toml
│
└── extension/       # Chrome Extension (Manifest V3)
```

## Tech Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: D1 (SQLite)
- **Vector DB**: Vectorize
- **AI**: Workers AI (embeddings)
- **Storage**: R2
- **Language**: TypeScript

### Extension
- **Platform**: Chrome/Edge Manifest V3
- **Storage**: IndexedDB + chrome.storage
- **UI**: Vanilla JS + CSS

## Quick Start

### Backend

```bash
cd backend
npm install
npm run deploy
```

**Backend URL**: `https://my-memory.kureckamichal.workers.dev`
**Custom Domain**: `memory.michalkurecka.cz`

### Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `extension/`

## Documentation

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for full technical reference.

---

**Version:** 3.0.0 | **Status:** ✅ Production Ready
