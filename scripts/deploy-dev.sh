#!/bin/bash
set -e

echo "🚀 Deploying to Development Environment..."

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
  --config-env dev \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo "✅ Deployment to Development complete!"
