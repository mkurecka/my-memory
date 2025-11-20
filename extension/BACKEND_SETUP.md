# Backend Configuration Guide

## Overview

The Universal Text Processor extension is now connected to a **Cloudflare Workers** backend that provides:

- **D1 Database**: User data, posts, and memory storage
- **KV Namespaces**: Caching and session management
- **R2 Storage**: File and media storage
- **Worker API**: Fast edge computing for text processing

## Backend URL

**Production API**: `https://text-processor-api.kureckamichal.workers.dev`

## Configuration

### 1. API Settings

The extension automatically connects to the backend using settings in `settings.json`:

```json
{
  "backend": {
    "baseUrl": "https://text-processor-api.kureckamichal.workers.dev",
    "apiVersion": "v1"
  },
  "webhook": {
    "enabled": true,
    "url": "https://text-processor-api.kureckamichal.workers.dev/api/v1/webhook"
  }
}
```

### 2. API Client

The new `api-client.js` provides methods for:

- `saveToMemory(data)` - Save content to backend memory
- `processText(data)` - Process text with AI
- `sendWebhook(eventType, data)` - Send webhook events
- `getSettings()` - Fetch user settings
- `updateSettings(settings)` - Update user settings

### 3. Authentication

To authenticate with the backend:

1. Visit `https://text-processor-api.kureckamichal.workers.dev/auth/login`
2. Complete authentication
3. Copy your API key
4. Store it in extension storage:

```javascript
chrome.storage.local.set({ apiKey: 'your-api-key-here' });
```

## Available Endpoints

### Memory
- `POST /api/v1/memory` - Save content to memory
- `GET /api/v1/memory` - Retrieve saved memories

### Processing
- `POST /api/v1/process` - Process text with AI
- `POST /api/v1/process/batch` - Batch process multiple texts

### Settings
- `GET /api/v1/settings` - Get user settings
- `PUT /api/v1/settings` - Update user settings

### Webhooks
- `POST /api/v1/webhook` - Receive webhook events

## Features

### 1. Edge Computing
- **Startup Time**: <25ms
- **Global Distribution**: Deployed to 300+ cities worldwide
- **Low Latency**: Sub-100ms response times

### 2. Storage
- **D1 Database**: SQLite-based relational storage
- **KV Cache**: High-speed key-value store
- **R2 Bucket**: Object storage for files/images

### 3. Security
- JWT authentication
- Rate limiting
- CORS protection
- Input sanitization

## Development

### Local Testing

```bash
cd backend
npm run dev
```

This starts a local development server at `http://localhost:8787`

### Deployment

```bash
cd backend
npm run deploy
```

## Monitoring

Check Worker logs:
```bash
cd backend
npm run tail
```

## Troubleshooting

### Connection Issues

1. **Check API Key**: Ensure you have a valid API key stored
2. **Check Network**: Verify you can reach the Worker URL
3. **Check Console**: Look for errors in browser dev tools

### API Errors

- **401 Unauthorized**: Invalid or missing API key
- **429 Rate Limited**: Too many requests
- **500 Server Error**: Backend issue (check Worker logs)

## Migration Notes

The extension has been migrated from Railway to Cloudflare Workers for:
- ✅ Better performance (14ms startup vs 500ms+)
- ✅ Lower costs (generous free tier)
- ✅ Global edge network
- ✅ Integrated database and storage
- ✅ Better reliability and uptime

Old Railway URL has been replaced throughout the codebase.
