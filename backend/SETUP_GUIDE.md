# Backend Setup Guide

## Prerequisites

1. **Node.js**: Version 18+ required
2. **Cloudflare Account**: Free tier is sufficient
3. **OpenRouter API Key**: Get from https://openrouter.ai/

## Step-by-Step Setup

### 1. Authentication Issues

If `wrangler login` fails with OAuth errors, use API token instead:

```bash
# Get API token from: https://dash.cloudflare.com/profile/api-tokens
# Click "Create Token" -> "Edit Cloudflare Workers" template

# Set environment variable
export CLOUDFLARE_API_TOKEN=your_api_token_here

# Or create .env file
echo "CLOUDFLARE_API_TOKEN=your_api_token_here" > .env
```

### 2. Create Cloudflare Resources

```bash
cd backend

# Install dependencies
npm install

# Create D1 database
npx wrangler d1 create text-processor-db
# Copy the database_id from output

# Create KV namespaces
npx wrangler kv:namespace create CACHE
# Copy the id from output

npx wrangler kv:namespace create SESSIONS
# Copy the id from output

# Create R2 bucket
npx wrangler r2 bucket create text-processor-storage
```

### 3. Update wrangler.toml

Edit `wrangler.toml` and add the IDs from step 2:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "text-processor-db"
database_id = "abc123-your-database-id"  # Add this

[[ kv_namespaces ]]
binding = "CACHE"
id = "abc123-your-cache-kv-id"  # Add this

[[ kv_namespaces ]]
binding = "SESSIONS"
id = "abc123-your-sessions-kv-id"  # Add this
```

Also update environment variables:

```toml
[vars]
ENVIRONMENT = "production"
JWT_SECRET = "generate-a-secure-random-string-here"  # Use: openssl rand -base64 32
API_VERSION = "v1"
APP_URL = "https://your-domain.com"
OPENROUTER_API_KEY = "sk-or-v1-your-api-key"  # From OpenRouter
```

### 4. Run Database Migrations

```bash
# Apply migrations to create tables
npx wrangler d1 migrations apply text-processor-db --remote
```

### 5. Test Locally

```bash
# Start local development server
npm run dev
```

The server will start at `http://localhost:8787`

Test the health endpoint:
```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": 1234567890
}
```

### 6. Test Authentication

Register a test user:
```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

Expected response:
```json
{
  "success": true,
  "userId": "uuid-here",
  "token": "jwt-token-here",
  "user": {
    "email": "test@example.com",
    "subscription_tier": "free"
  }
}
```

### 7. Deploy to Production

```bash
npm run deploy
```

Your API will be deployed to: `https://text-processor-api.your-subdomain.workers.dev`

### 8. Update Chrome Extension

Update the extension's API endpoint in `extension/src/config.js`:

```javascript
const API_BASE_URL = 'https://text-processor-api.your-subdomain.workers.dev';
```

## Troubleshooting

### OAuth Login Fails

**Problem**: `wrangler login` shows "parameter doesn't match" error

**Solution**: Use API token instead:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create token with "Edit Cloudflare Workers" template
3. Export as environment variable: `export CLOUDFLARE_API_TOKEN=your_token`

### D1 Database Creation Fails

**Problem**: `Error: Could not create database`

**Solution**:
1. Check you're logged in: `npx wrangler whoami`
2. Verify account permissions in Cloudflare dashboard
3. Try with explicit account ID: `npx wrangler d1 create text-processor-db --account-id YOUR_ACCOUNT_ID`

### KV Creation Fails

**Problem**: `Error: Could not create namespace`

**Solution**: Same as D1, use explicit account ID or check permissions

### Migration Fails

**Problem**: `Error: Could not apply migrations`

**Solution**:
1. Verify database exists: `npx wrangler d1 list`
2. Check migration file syntax in `migrations/0001_initial_schema.sql`
3. Apply with verbose logging: `npx wrangler d1 migrations apply text-processor-db --remote --verbose`

### Deployment Fails

**Problem**: `Error: Missing environment variable`

**Solution**: Ensure all required vars are in `wrangler.toml`:
- JWT_SECRET
- OPENROUTER_API_KEY
- APP_URL

### CORS Errors in Extension

**Problem**: Extension shows CORS errors when calling API

**Solution**: Update CORS settings in `backend/src/index.ts`:
```typescript
app.use('*', cors({
  origin: ['chrome-extension://your-extension-id'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
```

## Production Checklist

Before going live:

- [ ] Change JWT_SECRET to secure random string
- [ ] Add OpenRouter API key
- [ ] Update APP_URL to production domain
- [ ] Set ENVIRONMENT to "production"
- [ ] Configure proper CORS origins
- [ ] Test all endpoints with production credentials
- [ ] Set up monitoring in Cloudflare dashboard
- [ ] Configure rate limiting thresholds
- [ ] Test webhook functionality
- [ ] Backup database migration files

## Security Best Practices

1. **JWT Secret**: Generate with `openssl rand -base64 32`
2. **API Keys**: Never commit to git, use environment variables
3. **CORS**: Restrict to specific extension ID in production
4. **Rate Limiting**: Configure appropriate limits per tier
5. **Input Validation**: Already implemented in routes
6. **Password Hashing**: PBKDF2 with 100,000 iterations
7. **HTTPS Only**: Cloudflare Workers enforce HTTPS by default

## Monitoring

Access in Cloudflare Dashboard:

1. **Workers Analytics**:
   - Navigate to Workers & Pages
   - Click on your worker
   - View Analytics tab

2. **D1 Analytics**:
   - Navigate to Storage & Databases
   - Click on your D1 database
   - View Metrics

3. **Logs**:
   - Real-time: `npx wrangler tail`
   - Dashboard: Workers > Logs

## Cost Management

Free tier includes:
- 100,000 requests/day
- D1: 5M reads/day, 100K writes/day
- KV: 100K reads/day, 1K writes/day
- R2: 10GB storage

To monitor usage:
1. Cloudflare Dashboard > Account Home
2. View "Workers Usage" section
3. Set up billing alerts

## Next Steps

1. ✅ Backend deployed and tested
2. Update Chrome extension to use backend API
3. Migrate API key storage from extension to backend
4. Implement settings sync
5. Add webhook integration
6. Set up analytics dashboard
7. Configure custom domain (optional)

## Support

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Hono Framework: https://hono.dev/
- OpenRouter API: https://openrouter.ai/docs
