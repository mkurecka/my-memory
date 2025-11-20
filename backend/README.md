# Universal Text Processor - Backend API

Cloudflare Workers-based backend for the Universal Text Processor Chrome extension.

## Architecture

- **Runtime**: Cloudflare Workers (Edge computing)
- **Framework**: Hono (Express-like routing)
- **Database**: D1 (SQLite at the edge)
- **Cache**: KV (Key-value storage for sessions)
- **Storage**: R2 (Object storage for images/backups)
- **Language**: TypeScript

## Features

- 🔐 JWT-based authentication
- 🔑 Secure API key storage (encrypted)
- 🚀 OpenRouter API proxy
- 📊 Usage tracking and analytics
- 🔄 Cross-device settings sync
- 🎯 Rate limiting
- 📝 Post management (pending/approved/done/rejected)
- 🧠 Memory system for context
- 🪝 Webhook support
- 📈 Real-time statistics

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 3. Create Resources

```bash
# Create D1 database
npx wrangler d1 create text-processor-db

# Create KV namespaces
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create SESSIONS

# Create R2 bucket
npx wrangler r2 bucket create text-processor-storage
```

### 4. Update wrangler.toml

Add the IDs from the previous commands to `wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "text-processor-db"
database_id = "YOUR_D1_DATABASE_ID"

[[ kv_namespaces ]]
binding = "CACHE"
id = "YOUR_CACHE_KV_ID"

[[ kv_namespaces ]]
binding = "SESSIONS"
id = "YOUR_SESSIONS_KV_ID"
```

### 5. Configure Environment Variables

Update the `[vars]` section in `wrangler.toml`:

```toml
[vars]
JWT_SECRET = "your-secure-random-string-here"
OPENROUTER_API_KEY = "your-openrouter-api-key"
APP_URL = "https://your-app-url.com"
```

### 6. Run Migrations

```bash
npm run d1:migrate
```

### 7. Test Locally

```bash
npm run dev
```

Visit `http://localhost:8787` to test the API.

### 8. Deploy to Production

```bash
npm run deploy
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

#### POST /api/auth/login
Login and get JWT token.

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

#### POST /api/auth/logout
Logout current session.

### Processing

#### POST /api/process/text
Process text through AI models.

```json
{
  "text": "Your text here",
  "mode": "rewrite_twitter",
  "account": "main",
  "language": "en",
  "comment": "Make it engaging",
  "sendWebhook": false,
  "context": {
    "url": "https://example.com",
    "pageTitle": "Example Page"
  }
}
```

#### POST /api/process/image
Process images through vision models.

```json
{
  "imageUrl": "https://example.com/image.jpg",
  "mode": "describe_image",
  "context": {
    "url": "https://example.com"
  }
}
```

### Posts

#### GET /api/posts
List all posts with optional filters.

Query params:
- `status`: pending/approved/done/rejected
- `type`: processed/memory
- `limit`: number (default: 50)
- `offset`: number (default: 0)

#### GET /api/posts/:id
Get single post by ID.

#### PATCH /api/posts/:id
Update post status or output.

```json
{
  "status": "approved",
  "generated_output": "Updated text"
}
```

#### DELETE /api/posts/:id
Delete a post.

#### GET /api/posts/stats/summary
Get post statistics.

### Memory

#### POST /api/memory
Save text to memory.

```json
{
  "text": "Important note",
  "tag": "ideas",
  "priority": "high",
  "context": {
    "url": "https://example.com"
  }
}
```

#### GET /api/memory
List all memories with filters.

Query params:
- `tag`: string
- `priority`: low/medium/high
- `limit`: number (default: 50)
- `offset`: number (default: 0)

#### GET /api/memory/:id
Get single memory.

#### PATCH /api/memory/:id
Update memory.

#### DELETE /api/memory/:id
Delete memory.

#### GET /api/memory/tags/list
Get all unique tags.

### Settings

#### GET /api/settings
Get user settings.

#### PUT /api/settings
Replace all settings.

```json
{
  "models": {
    "contentModel": "anthropic/claude-3.5-sonnet",
    "imageModel": "google/gemini-2.0-flash-001"
  },
  "customPrompts": {
    "rewrite_twitter": "Custom prompt template"
  },
  "webhook": {
    "enabled": true,
    "url": "https://your-webhook.com"
  }
}
```

#### PATCH /api/settings
Partially update settings.

#### PUT /api/settings/models
Update model settings.

```json
{
  "contentModel": "anthropic/claude-3.5-sonnet",
  "imageModel": "google/gemini-2.0-flash-001"
}
```

#### PUT /api/settings/webhook
Update webhook settings.

```json
{
  "enabled": true,
  "url": "https://your-webhook.com"
}
```

## Database Schema

### users
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE)
- password_hash (TEXT)
- created_at (INTEGER)
- last_active (INTEGER)
- settings_json (TEXT)
- subscription_tier (TEXT: free/pro/enterprise)
- api_usage_count (INTEGER)
- api_usage_reset_at (INTEGER)

### posts
- id (TEXT PRIMARY KEY)
- user_id (TEXT FOREIGN KEY)
- type (TEXT: processed/memory)
- mode (TEXT)
- account (TEXT)
- original_text (TEXT)
- generated_output (TEXT)
- language (TEXT)
- status (TEXT: pending/approved/done/rejected)
- context_json (TEXT)
- created_at (INTEGER)
- updated_at (INTEGER)

### memory
- id (TEXT PRIMARY KEY)
- user_id (TEXT FOREIGN KEY)
- text (TEXT)
- context_json (TEXT)
- tag (TEXT)
- priority (TEXT: low/medium/high)
- created_at (INTEGER)

### api_requests
- id (TEXT PRIMARY KEY)
- user_id (TEXT FOREIGN KEY)
- endpoint (TEXT)
- model (TEXT)
- mode (TEXT)
- prompt_tokens (INTEGER)
- completion_tokens (INTEGER)
- total_tokens (INTEGER)
- cost_usd (REAL)
- response_time_ms (INTEGER)
- status_code (INTEGER)
- error_message (TEXT)
- created_at (INTEGER)

### webhooks
- id (TEXT PRIMARY KEY)
- user_id (TEXT FOREIGN KEY)
- url (TEXT)
- enabled (INTEGER)
- events_json (TEXT)
- secret (TEXT)
- last_triggered_at (INTEGER)
- success_count (INTEGER)
- failure_count (INTEGER)
- created_at (INTEGER)

### custom_prompts
- id (TEXT PRIMARY KEY)
- user_id (TEXT FOREIGN KEY)
- mode (TEXT)
- prompt_template (TEXT)
- created_at (INTEGER)
- updated_at (INTEGER)

## Security

- Password hashing: PBKDF2 (100,000 iterations, SHA-256)
- JWT tokens: HS256 with 24h expiry
- API keys: Stored encrypted in D1
- Rate limiting: Via KV store
- Input validation: All user inputs sanitized
- CORS: Configured for Chrome extension only

## Performance

- Target latency: <50ms globally (edge computing)
- Database: D1 with proper indexes
- Caching: KV for frequent reads
- CDN: Cloudflare global network

## Development

### Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main worker entry
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── process.ts        # Processing endpoints
│   │   ├── posts.ts          # Posts CRUD
│   │   ├── memory.ts         # Memory management
│   │   └── settings.ts       # Settings sync
│   └── utils/
│       ├── crypto.ts         # Password hashing
│       ├── jwt.ts            # JWT operations
│       └── id.ts             # ID generation
├── migrations/
│   └── 0001_initial_schema.sql
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Commands

```bash
npm run dev          # Start local development server
npm run deploy       # Deploy to production
npm run d1:migrate   # Run database migrations
npm run kv:create    # Create KV namespaces
npm run r2:create    # Create R2 bucket
```

## Monitoring

Access logs and analytics in Cloudflare Dashboard:
- Workers Analytics
- D1 Analytics
- KV Analytics
- R2 Analytics

## Cost Estimation

Cloudflare Workers pricing (Free tier):
- 100,000 requests/day free
- D1: 5M reads/day, 100K writes/day free
- KV: 100K reads/day, 1K writes/day free
- R2: 10GB storage free

Expected cost for 10K active users: ~$5-10/month

## Support

For issues and questions:
- Extension Issues: [extension/README.md]
- Backend Issues: Create issue on GitHub
- Cloudflare Docs: https://developers.cloudflare.com/workers/
