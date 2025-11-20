#!/bin/bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
echo "Running database migrations..."
npx wrangler d1 migrations apply text-processor-db --remote
echo ""
echo "✅ Database migrations applied"
