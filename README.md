# Universal Text Processor

Full-stack text processing application with browser extension and Cloudflare Workers backend.

## Project Structure

```
universal-text-processor/
├── backend/              # Cloudflare Workers API
│   ├── src/             # TypeScript source code
│   ├── migrations/      # D1 database migrations
│   └── wrangler.toml    # Cloudflare configuration
│
├── extension/           # Chrome/Edge browser extension
│   ├── background.js    # Service worker
│   ├── content.js       # Content script with FAB
│   ├── api-client.js    # Backend API client
│   └── manifest.json    # Extension manifest
│
└── docs/                # Documentation
```

## Features

### Browser Extension
- 🎯 **FAB Interface** - Floating action button for quick text processing
- 💾 **Memory Storage** - Save text snippets with context to backend
- 🤖 **AI Processing** - Process text with customizable AI models
- 🗄️ **Local Database** - IndexedDB for offline storage
- ⚙️ **Settings Manager** - Customizable profiles and modes

### Backend (Cloudflare Workers)
- ⚡ **Edge Computing** - Global deployment with <20ms startup
- 🗄️ **D1 Database** - SQLite-based persistent storage
- 🔑 **KV Cache** - High-speed key-value caching
- 📦 **R2 Storage** - Object storage for files/images
- 🔐 **JWT Auth** - Secure authentication system
- 🪝 **Webhooks** - Event-driven integrations

## Quick Start

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Watch logs
npm run tail
```

**Backend URL**: `https://text-processor-api.kureckamichal.workers.dev`

### Extension Setup

1. Open Chrome/Edge
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension/` directory

### Testing

```bash
# Open test page
open extension/activate-test.html

# Or test on any webpage:
# 1. Select text
# 2. FAB appears in bottom-left
# 3. Click and choose action
```

## Documentation

- [Quick Start Guide](QUICK_START.md) - Get up and running
- [Testing Guide](TESTING_GUIDE.md) - Testing procedures
- [Backend Setup](backend/README.md) - Backend details

## Tech Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: D1 (SQLite)
- **Language**: TypeScript

### Extension
- **Platform**: Chrome/Edge Manifest V3
- **Storage**: IndexedDB + chrome.storage
- **UI**: Vanilla JS + CSS

## Infrastructure

**Deployed Backend**: https://text-processor-api.kureckamichal.workers.dev
- D1 Database: `text-processor-db`
- KV Namespaces: CACHE, SESSIONS
- R2 Bucket: `text-processor-storage`
- Performance: 14-19ms startup, <200ms API response

---

**Version:** 2.2.0 | **Status:** ✅ Production Ready
