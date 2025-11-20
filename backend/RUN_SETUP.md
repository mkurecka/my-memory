# Quick Setup Guide

Since bash context is having issues, run these scripts manually in your terminal:

## Step 1: Install Dependencies

```bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
chmod +x *.sh
./01-install.sh
```

## Step 2: Create D1 Database

```bash
./02-create-d1.sh
```

**Copy the `database_id` from the output** and update line 11 in `wrangler.toml`:
```toml
database_id = "YOUR_DATABASE_ID_HERE"
```

## Step 3: Create KV Namespaces

```bash
./03-create-kv.sh
```

**Copy both KV IDs** and update lines 15 and 19 in `wrangler.toml`:
```toml
[[ kv_namespaces ]]
binding = "CACHE"
id = "YOUR_CACHE_ID_HERE"

[[ kv_namespaces ]]
binding = "SESSIONS"
id = "YOUR_SESSIONS_ID_HERE"
```

## Step 4: Create R2 Bucket

```bash
./04-create-r2.sh
```

## Step 5: Configure Environment Variables

Edit `wrangler.toml` and update:

### Generate JWT Secret:
```bash
openssl rand -base64 32
```

Update line 28:
```toml
JWT_SECRET = "paste-generated-secret-here"
```

### Add OpenRouter API Key:

Get from: https://openrouter.ai/keys

Update line 31:
```toml
OPENROUTER_API_KEY = "sk-or-v1-your-key-here"
```

## Step 6: Run Migrations

```bash
./05-migrate.sh
```

## Step 7: Test Locally

```bash
npm run dev
```

Visit http://localhost:8787/health - should return:
```json
{"success":true,"status":"healthy","timestamp":...}
```

Test registration:
```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

## Step 8: Deploy

```bash
npm run deploy
```

---

## Alternative: Run All At Once

If you prefer to run commands directly:

```bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend

# Install
npm install

# Create resources
npx wrangler d1 create text-processor-db
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create SESSIONS
npx wrangler r2 bucket create text-processor-storage

# Update wrangler.toml with the IDs from above
# Generate and add JWT_SECRET
# Add OPENROUTER_API_KEY

# Run migrations
npx wrangler d1 migrations apply text-processor-db --remote

# Test
npm run dev

# Deploy
npm run deploy
```
