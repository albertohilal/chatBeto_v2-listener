#!/bin/bash
# Health check script for monitoring

ENDPOINT="http://localhost:3000/health"
TIMEOUT=10

echo "🔍 Checking ChatBETO Listener health..."

response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT $ENDPOINT)
http_code="${response: -3}"
body="${response%???}"

if [ "$http_code" -eq 200 ]; then
    echo "✅ Service is healthy"
    echo "📊 Response: $body"
    exit 0
else
    echo "❌ Service is unhealthy (HTTP $http_code)"
    echo "📄 Response: $body"
    exit 1
fi