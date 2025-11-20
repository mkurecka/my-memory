#!/bin/bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
echo "Creating R2 bucket..."
npx wrangler r2 bucket create text-processor-storage
echo ""
echo "✅ R2 bucket created"
