#!/bin/bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
echo "Creating KV namespace: CACHE..."
npx wrangler kv:namespace create CACHE
echo ""
echo "Creating KV namespace: SESSIONS..."
npx wrangler kv:namespace create SESSIONS
echo ""
echo "⚠️  IMPORTANT: Copy both KV namespace IDs and update wrangler.toml"
