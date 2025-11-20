# Setup Commands

Run these commands one by one in your terminal:

## 1. Navigate to backend directory

```bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
```

## 2. Install dependencies

```bash
npm install
```

## 3. Verify authentication

```bash
npx wrangler whoami
```

## 4. Create D1 Database

```bash
npx wrangler d1 create text-processor-db
```

**Copy the `database_id` from the output** and update `wrangler.toml`:
```toml
database_id = "YOUR_DATABASE_ID_HERE"
```

## 5. Create KV Namespace - CACHE

```bash
npx wrangler kv:namespace create CACHE
```

**Copy the `id` from the output** and update the first KV namespace in `wrangler.toml`:
```toml
[[ kv_namespaces ]]
binding = "CACHE"
id = "YOUR_CACHE_ID_HERE"
```

## 6. Create KV Namespace - SESSIONS

```bash
npx wrangler kv:namespace create SESSIONS
```

**Copy the `id` from the output** and update the second KV namespace in `wrangler.toml`:
```toml
[[ kv_namespaces ]]
binding = "SESSIONS"
id = "YOUR_SESSIONS_ID_HERE"
```

## 7. Create R2 Bucket

```bash
npx wrangler r2 bucket create text-processor-storage
```

## 8. Generate JWT Secret

```bash
openssl rand -base64 32
```

**Copy the output** and update `wrangler.toml`:
```toml
JWT_SECRET = "YOUR_GENERATED_SECRET_HERE"
```

## 9. Add OpenRouter API Key

Update `wrangler.toml`:
```toml
OPENROUTER_API_KEY = "sk-or-v1-YOUR_API_KEY_HERE"
```

Get your API key from: https://openrouter.ai/keys

## 10. Run Database Migrations

```bash
npx wrangler d1 migrations apply text-processor-db --remote
```

## 11. Test Locally

```bash
npm run dev
```

Visit: http://localhost:8787/health

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": 1234567890
}
```

## 12. Test Registration

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

## 13. Deploy to Production

```bash
npm run deploy
```

Your API will be available at: `https://text-processor-api.YOUR-SUBDOMAIN.workers.dev`

## Quick Setup Script (Alternative)

Make the setup script executable and run it:

```bash
chmod +x setup-cloudflare.sh
./setup-cloudflare.sh
```

This will attempt to create all resources and update wrangler.toml automatically.

## Troubleshooting

### Command not found: wrangler

```bash
npm install
```

### Not authenticated

```bash
npx wrangler login
```

### Resource already exists

If you see "already exists" errors, that's fine - the resources are already created. Just make sure to copy their IDs to wrangler.toml.

### Migration fails

Make sure database_id is set in wrangler.toml:
```bash
npx wrangler d1 migrations apply text-processor-db --remote --verbose
```

### Local dev fails

Check that all IDs are set in wrangler.toml and JWT_SECRET is configured.
