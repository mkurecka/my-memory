#!/bin/bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
echo "Creating D1 database..."
npx wrangler d1 create text-processor-db
echo ""
echo "⚠️  IMPORTANT: Copy the database_id from above and update wrangler.toml"
