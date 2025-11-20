# Backend Architecture for Universal Text Processor

## Current Architecture Analysis

### What Extension Currently Does:
1. **API Key Management** - Stored in chrome.storage.local (security risk)
2. **Direct OpenRouter Calls** - From browser to OpenRouter API
3. **Local Database** - IndexedDB for processed posts
4. **Webhook Management** - Direct POST from extension
5. **Settings Storage** - Local chrome.storage only
6. **Image Processing** - URL extraction and sending to AI

### Issues with Current Approach:
- ❌ API keys exposed in browser
- ❌ No centralized data storage
- ❌ Can't sync across devices
- ❌ No rate limiting or usage tracking
- ❌ No backup capabilities
- ❌ Each user manages separate database
- ❌ No analytics or monitoring
- ❌ Difficult to implement advanced features

---

## Proposed Backend Architecture

### Tech Stack: Cloudflare Workers

**Why Cloudflare Workers:**
- ✅ Edge computing (low latency globally)
- ✅ Free tier: 100k requests/day
- ✅ Built-in KV storage (key-value)
- ✅ D1 database (SQLite at edge)
- ✅ R2 object storage (for files)
- ✅ Durable Objects (stateful operations)
- ✅ Easy deployment and scaling
- ✅ Workers AI (optional AI processing at edge)
- ✅ Rate limiting built-in
- ✅ Secrets management

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Content.js  │  │ Background.js│  │   Popup UI   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                     JWT Token Auth                          │
└────────────────────────────┼────────────────────────────────┘
                             │
                    HTTPS (Encrypted)
                             │
┌────────────────────────────▼────────────────────────────────┐
│              CLOUDFLARE WORKER (Edge API)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes & Middleware                 │  │
│  │  • POST /api/process-text                           │  │
│  │  • POST /api/process-image                          │  │
│  │  • POST /api/posts (save/retrieve)                  │  │
│  │  • GET  /api/posts/:id                              │  │
│  │  • PUT  /api/posts/:id/status                       │  │
│  │  • GET  /api/memory                                 │  │
│  │  • POST /api/memory                                 │  │
│  │  • GET  /api/settings                               │  │
│  │  • PUT  /api/settings                               │  │
│  │  • POST /api/webhook/trigger                        │  │
│  │  • GET  /api/analytics                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────┬──────────┼──────────┬──────────────┐    │
│  │              │           │          │              │    │
│  ▼              ▼           ▼          ▼              ▼    │
│ ┌──────┐  ┌─────────┐  ┌──────┐  ┌────────┐  ┌─────────┐│
│ │  KV  │  │Workers  │  │  D1  │  │   R2   │  │ Durable ││
│ │Cache │  │   AI    │  │  DB  │  │Storage │  │ Objects ││
│ └──────┘  └─────────┘  └──────┘  └────────┘  └─────────┘│
│   Fast       Optional    SQLite    Files      Stateful   │
│   Cache      AI Models   Database  (Images)   (Sessions) │
└────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │OpenRouter│  │ Webhooks │  │Analytics │
         │   API    │  │(External)│  │ Service  │
         └──────────┘  └──────────┘  └──────────┘
```

---

## Database Schema (D1 - SQLite)

### Tables

#### 1. **users**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,   -- Unix timestamp
  last_active INTEGER,
  settings_json TEXT,             -- JSON blob for user settings
  subscription_tier TEXT DEFAULT 'free', -- free, pro, enterprise
  api_usage_count INTEGER DEFAULT 0,
  api_usage_reset_at INTEGER
);

CREATE INDEX idx_users_email ON users(email);
```

#### 2. **posts**
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,           -- UUID
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,            -- 'processed', 'memory'
  mode TEXT,                     -- 'rewrite_twitter', 'article', etc.
  account TEXT,                  -- Account profile used
  original_text TEXT NOT NULL,
  generated_output TEXT,
  language TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'done', 'rejected'
  context_json TEXT,             -- JSON: {url, pageTitle, timestamp, etc.}
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

#### 3. **memory**
```sql
CREATE TABLE memory (
  id TEXT PRIMARY KEY,           -- UUID
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  context_json TEXT,             -- JSON: {url, pageTitle, tag, priority}
  tag TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_memory_user_id ON memory(user_id);
CREATE INDEX idx_memory_tag ON memory(tag);
CREATE INDEX idx_memory_created_at ON memory(created_at);
```

#### 4. **api_requests**
```sql
CREATE TABLE api_requests (
  id TEXT PRIMARY KEY,           -- UUID
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT,                    -- AI model used
  mode TEXT,                     -- Action mode
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,                 -- Calculated cost
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_requests_user_id ON api_requests(user_id);
CREATE INDEX idx_api_requests_created_at ON api_requests(created_at);
```

#### 5. **webhooks**
```sql
CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,           -- UUID
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,     -- Boolean: 0 or 1
  events_json TEXT,              -- JSON array: ['onProcessText', 'onSaveToMemory']
  secret TEXT,                   -- Webhook secret for verification
  last_triggered_at INTEGER,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
```

#### 6. **custom_prompts**
```sql
CREATE TABLE custom_prompts (
  id TEXT PRIMARY KEY,           -- UUID
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,            -- 'rewrite_twitter', 'article', etc.
  prompt_template TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, mode)
);

CREATE INDEX idx_custom_prompts_user_id ON custom_prompts(user_id);
```

---

## KV Storage Structure

**KV (Key-Value Store)** - Used for fast caching and session data

```javascript
// Cache processed responses (5 min TTL)
kv_cache_response:{hash}
  → { content, tokens, model, timestamp }

// Rate limiting
kv_rate_limit:{user_id}:{endpoint}
  → { count, resetAt }

// Session tokens
kv_session:{token}
  → { userId, email, createdAt, expiresAt }

// User settings cache (1 hour TTL)
kv_settings:{user_id}
  → { models, prompts, webhook, accounts }

// API key encryption
kv_api_key:{user_id}
  → { encryptedKey, iv, salt }
```

---

## R2 Object Storage

**R2** - For large files and backups

```
Structure:
/users/{user_id}/
  /images/{image_id}.{ext}        - Uploaded images
  /exports/posts_{timestamp}.json  - Data exports
  /backups/db_{timestamp}.sql      - Database backups
```

---

## API Endpoints

### Authentication

#### POST `/api/auth/register`
```json
Request:
{
  "email": "user@example.com",
  "password": "hashed_password"
}

Response:
{
  "userId": "uuid",
  "token": "jwt_token",
  "expiresAt": 1234567890
}
```

#### POST `/api/auth/login`
```json
Request:
{
  "email": "user@example.com",
  "password": "hashed_password"
}

Response:
{
  "userId": "uuid",
  "token": "jwt_token",
  "user": {
    "email": "user@example.com",
    "subscriptionTier": "free",
    "settings": {...}
  }
}
```

### Text Processing

#### POST `/api/process-text`
```json
Request:
{
  "text": "Selected text to process",
  "mode": "rewrite_twitter",
  "account": "michalku_com",
  "language": "en",
  "actionParams": {
    "targetPlatform": "medium"
  },
  "context": {
    "url": "https://example.com",
    "pageTitle": "Article Title"
  }
}

Response:
{
  "success": true,
  "content": "Generated content",
  "postId": "uuid",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 75,
    "totalTokens": 225
  }
}
```

#### POST `/api/process-image`
```json
Request:
{
  "imageUrl": "https://example.com/image.jpg",
  "mode": "describe_image",
  "actionParams": {
    "detailLevel": "standard"
  },
  "context": {...}
}

Response:
{
  "success": true,
  "content": "Image description and recreation prompt",
  "postId": "uuid",
  "usage": {...}
}
```

### Posts Management

#### GET `/api/posts`
```json
Query params:
?status=pending&limit=50&offset=0&type=processed

Response:
{
  "posts": [
    {
      "id": "uuid",
      "type": "processed",
      "mode": "article",
      "originalText": "...",
      "generatedOutput": "...",
      "status": "pending",
      "createdAt": 1234567890
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### PUT `/api/posts/:id/status`
```json
Request:
{
  "status": "approved"
}

Response:
{
  "success": true,
  "post": {...}
}
```

#### DELETE `/api/posts/:id`
```json
Response:
{
  "success": true
}
```

### Memory Management

#### POST `/api/memory`
```json
Request:
{
  "text": "Text to remember",
  "tag": "research",
  "priority": "high",
  "context": {...}
}

Response:
{
  "success": true,
  "memoryId": "uuid"
}
```

#### GET `/api/memory`
```json
Query params:
?tag=research&priority=high&limit=50

Response:
{
  "memories": [
    {
      "id": "uuid",
      "text": "...",
      "tag": "research",
      "priority": "high",
      "createdAt": 1234567890
    }
  ]
}
```

### Settings

#### GET `/api/settings`
```json
Response:
{
  "settings": {
    "models": {
      "contentModel": "openai/gpt-4o-mini",
      "imageModel": "google/gemini-2.0-flash-001"
    },
    "customPrompts": {
      "rewrite_twitter": "...",
      "article": ""
    },
    "webhook": {
      "enabled": true,
      "url": "https://..."
    },
    "accounts": [...]
  }
}
```

#### PUT `/api/settings`
```json
Request:
{
  "models": {...},
  "customPrompts": {...},
  "webhook": {...}
}

Response:
{
  "success": true,
  "settings": {...}
}
```

### Analytics

#### GET `/api/analytics/usage`
```json
Query params:
?start=1234567890&end=1234567890&granularity=day

Response:
{
  "usage": [
    {
      "date": "2025-01-20",
      "requests": 150,
      "tokens": 45000,
      "costUsd": 0.45
    }
  ],
  "total": {
    "requests": 1500,
    "tokens": 450000,
    "costUsd": 4.50
  }
}
```

### Webhooks

#### POST `/api/webhooks`
```json
Request:
{
  "url": "https://your-webhook.com/endpoint",
  "events": ["onProcessText", "onSaveToMemory"],
  "secret": "webhook_secret_for_verification"
}

Response:
{
  "success": true,
  "webhookId": "uuid"
}
```

---

## Worker Code Structure

```
/workers/
├── src/
│   ├── index.ts                  # Main worker entry point
│   ├── routes/
│   │   ├── auth.ts              # Authentication routes
│   │   ├── process.ts           # Text/image processing
│   │   ├── posts.ts             # Posts CRUD
│   │   ├── memory.ts            # Memory management
│   │   ├── settings.ts          # Settings management
│   │   ├── webhooks.ts          # Webhook management
│   │   └── analytics.ts         # Analytics endpoints
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── rateLimit.ts         # Rate limiting
│   │   ├── cors.ts              # CORS headers
│   │   └── logger.ts            # Request logging
│   ├── services/
│   │   ├── openrouter.ts        # OpenRouter API client
│   │   ├── database.ts          # D1 database helpers
│   │   ├── cache.ts             # KV cache helpers
│   │   ├── storage.ts           # R2 storage helpers
│   │   └── webhook.ts           # Webhook trigger service
│   ├── utils/
│   │   ├── crypto.ts            # Encryption/hashing
│   │   ├── jwt.ts               # JWT utilities
│   │   ├── validation.ts        # Input validation
│   │   └── errors.ts            # Error handling
│   └── types/
│       └── index.ts             # TypeScript types
├── wrangler.toml                # Cloudflare configuration
├── package.json
└── tsconfig.json
```

---

## Extension Changes

### What Moves to Backend:
1. ✅ **API Key Storage** → Backend encrypted storage
2. ✅ **OpenRouter Calls** → Proxied through worker
3. ✅ **Database** → D1 instead of IndexedDB
4. ✅ **Settings** → Synced across devices
5. ✅ **Webhooks** → Managed by backend
6. ✅ **Analytics** → Centralized tracking

### What Stays in Extension:
1. ✅ **UI Components** (modal, FAB, etc.)
2. ✅ **Text/Image Selection**
3. ✅ **Local Caching** (optional, for offline)
4. ✅ **User Authentication State**

### Extension Architecture After Backend:

```javascript
// background.js
const API_BASE = 'https://api.textprocessor.com';

// Store only JWT token locally
async function authenticateUser(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { token, user } = await response.json();

  // Store JWT token
  await chrome.storage.local.set({ authToken: token, user });
}

// Make authenticated requests
async function processText(data) {
  const { authToken } = await chrome.storage.local.get('authToken');

  const response = await fetch(`${API_BASE}/api/process-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

---

## Security Features

### 1. **Authentication**
- JWT tokens (short-lived, 24h expiry)
- Refresh tokens for renewal
- Secure password hashing (bcrypt)

### 2. **API Key Encryption**
- User's OpenRouter keys encrypted with user-specific key
- Never exposed to client
- Stored encrypted in KV with AES-256

### 3. **Rate Limiting**
```javascript
// Per user, per endpoint
const limits = {
  free: { requests: 100, window: '1h' },
  pro: { requests: 1000, window: '1h' },
  enterprise: { requests: 10000, window: '1h' }
};
```

### 4. **Input Validation**
- Sanitize all user inputs
- Validate against schema
- Prevent injection attacks

### 5. **CORS**
- Whitelist extension origin only
- Secure headers

---

## Deployment Steps

### 1. **Setup Cloudflare Account**
```bash
npm install -g wrangler
wrangler login
```

### 2. **Create Worker**
```bash
wrangler init text-processor-backend
cd text-processor-backend
```

### 3. **Setup D1 Database**
```bash
wrangler d1 create text-processor-db
wrangler d1 execute text-processor-db --file=./schema.sql
```

### 4. **Setup KV Namespace**
```bash
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "SESSIONS"
```

### 5. **Setup R2 Bucket**
```bash
wrangler r2 bucket create text-processor-storage
```

### 6. **Configure wrangler.toml**
```toml
name = "text-processor-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[ d1_databases ]]
binding = "DB"
database_name = "text-processor-db"
database_id = "xxx"

[[ kv_namespaces ]]
binding = "CACHE"
id = "xxx"

[[ kv_namespaces ]]
binding = "SESSIONS"
id = "xxx"

[[ r2_buckets ]]
binding = "STORAGE"
bucket_name = "text-processor-storage"

[vars]
OPENROUTER_API_KEY = "encrypted_master_key"
JWT_SECRET = "your_jwt_secret"
```

### 7. **Deploy**
```bash
npm run build
wrangler deploy
```

---

## Cost Estimation (Cloudflare)

### Free Tier Limits:
- **Workers:** 100k requests/day
- **D1:** 5 GB storage, 5M reads/day, 100k writes/day
- **KV:** 100k reads/day, 1k writes/day
- **R2:** 10 GB storage, 10M reads/month, 1M writes/month

### Paid Tier (if needed):
- **Workers:** $5/month (10M requests)
- **D1:** $5/month (additional usage)
- **KV:** $0.50/GB storage
- **R2:** $0.015/GB storage

**Estimate for 1000 active users:**
- ~50k requests/day = FREE
- ~1 GB D1 storage = FREE
- ~100k KV operations/day = FREE
- **Total: $0/month** (within free tier)

---

## Migration Plan

### Phase 1: Backend Setup (Week 1)
- [ ] Setup Cloudflare Workers project
- [ ] Create D1 database schema
- [ ] Implement authentication endpoints
- [ ] Deploy basic API

### Phase 2: Core Features (Week 2)
- [ ] Process text/image endpoints
- [ ] Posts management
- [ ] Memory management
- [ ] Settings sync

### Phase 3: Extension Integration (Week 3)
- [ ] Update extension to use backend API
- [ ] Add authentication UI
- [ ] Migrate local data to backend
- [ ] Test end-to-end

### Phase 4: Advanced Features (Week 4)
- [ ] Analytics dashboard
- [ ] Webhook management UI
- [ ] Rate limiting
- [ ] Error monitoring

### Phase 5: Production (Week 5)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation
- [ ] Launch

---

## Benefits of This Architecture

### For Users:
✅ **Sync across devices** - Settings, posts, memory synced
✅ **Secure** - API keys never exposed in browser
✅ **Backup** - Data automatically backed up
✅ **Analytics** - Usage tracking and insights
✅ **Faster** - Edge computing = low latency
✅ **Offline support** - Optional local caching

### For Development:
✅ **Centralized logic** - Easier to update and maintain
✅ **Better monitoring** - Track usage, errors, performance
✅ **Scalable** - Cloudflare handles scaling automatically
✅ **Cost-effective** - Free tier covers most users
✅ **Advanced features** - AI at edge, webhooks, etc.

### For Business:
✅ **Monetization ready** - Subscription tiers built-in
✅ **Usage tracking** - Know how users interact
✅ **Rate limiting** - Prevent abuse
✅ **Multi-tenant** - Support many users

---

**Next Steps:**
1. Review and approve architecture
2. Create Cloudflare account
3. Start Phase 1: Backend setup
4. Implement core endpoints
5. Migrate extension to use backend

Would you like me to start implementing this backend architecture?
