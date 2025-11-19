#!/bin/bash
# Production deployment script

echo "🚀 Deploying ChatBETO Listener to production..."

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Warning: Running as root is not recommended"
fi

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with production configuration"
    echo "🔐 Make sure to change all secrets and passwords!"
    exit 1
fi

# Build and start services
echo "🔧 Building and starting services..."
docker-compose up -d --build

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 10

# Health check
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo "✅ Deployment successful! Service is healthy."
    echo "📡 Service is running at http://localhost:3000"
else
    echo "❌ Deployment failed! Service is not responding."
    echo "🔍 Check logs: docker-compose logs -f"
    exit 1
fi