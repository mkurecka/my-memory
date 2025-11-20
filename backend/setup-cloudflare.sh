#!/bin/bash

# Universal Text Processor - Cloudflare Setup Script
# This script creates all necessary Cloudflare resources

set -e

echo "🚀 Setting up Cloudflare resources for Universal Text Processor..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Installing..."
    npm install
fi

# Check if logged in
echo "📋 Checking Cloudflare authentication..."
if ! npx wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run: wrangler login"
    exit 1
fi

echo "✅ Authenticated with Cloudflare"
echo ""

# Create D1 Database
echo "📊 Creating D1 database..."
D1_OUTPUT=$(npx wrangler d1 create text-processor-db 2>&1)
echo "$D1_OUTPUT"

# Extract database ID
D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$D1_ID" ]; then
    echo "⚠️  Could not extract D1 database ID. Please check output above."
    echo "You may need to manually add it to wrangler.toml"
else
    echo "✅ D1 Database ID: $D1_ID"
    # Update wrangler.toml with D1 ID
    sed -i.bak "s/database_id = \"\" # Will be filled after creation/database_id = \"$D1_ID\"/" wrangler.toml
    echo "✅ Updated wrangler.toml with D1 database ID"
fi

echo ""

# Create KV Namespace for CACHE
echo "💾 Creating KV namespace: CACHE..."
CACHE_OUTPUT=$(npx wrangler kv:namespace create CACHE 2>&1)
echo "$CACHE_OUTPUT"

CACHE_ID=$(echo "$CACHE_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)

if [ -z "$CACHE_ID" ]; then
    echo "⚠️  Could not extract CACHE KV ID. Please check output above."
else
    echo "✅ CACHE KV ID: $CACHE_ID"
    # Update first KV namespace ID in wrangler.toml
    sed -i.bak "0,/id = \"\" # Will be filled after creation/s//id = \"$CACHE_ID\"/" wrangler.toml
    echo "✅ Updated wrangler.toml with CACHE KV ID"
fi

echo ""

# Create KV Namespace for SESSIONS
echo "💾 Creating KV namespace: SESSIONS..."
SESSIONS_OUTPUT=$(npx wrangler kv:namespace create SESSIONS 2>&1)
echo "$SESSIONS_OUTPUT"

SESSIONS_ID=$(echo "$SESSIONS_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)

if [ -z "$SESSIONS_ID" ]; then
    echo "⚠️  Could not extract SESSIONS KV ID. Please check output above."
else
    echo "✅ SESSIONS KV ID: $SESSIONS_ID"
    # Update second KV namespace ID in wrangler.toml
    sed -i.bak "0,/id = \"\" # Will be filled after creation/{0,/id = \"\" # Will be filled after creation/! s/id = \"\" # Will be filled after creation/id = \"$SESSIONS_ID\"/;}" wrangler.toml
    echo "✅ Updated wrangler.toml with SESSIONS KV ID"
fi

echo ""

# Create R2 Bucket
echo "🪣 Creating R2 bucket..."
R2_OUTPUT=$(npx wrangler r2 bucket create text-processor-storage 2>&1)
echo "$R2_OUTPUT"

if echo "$R2_OUTPUT" | grep -q "Created bucket"; then
    echo "✅ R2 bucket created successfully"
else
    echo "⚠️  R2 bucket creation may have failed. Check output above."
fi

echo ""
echo "🎉 Resource creation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update environment variables in wrangler.toml:"
echo "   - JWT_SECRET (generate with: openssl rand -base64 32)"
echo "   - OPENROUTER_API_KEY (get from: https://openrouter.ai/)"
echo ""
echo "2. Run database migrations:"
echo "   npm run d1:migrate"
echo ""
echo "3. Test locally:"
echo "   npm run dev"
echo ""
echo "4. Deploy to production:"
echo "   npm run deploy"
echo ""
