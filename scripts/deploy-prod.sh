#!/bin/bash
set -e

echo "🚀 Deploying to Production Environment..."

# Confirmation prompt
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Build with SAM
echo "🔨 Building with SAM..."
sam build

# Deploy to AWS
echo "☁️ Deploying to AWS..."
sam deploy \
  --config-env prod \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo "✅ Deployment to Production complete!"
