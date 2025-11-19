#!/bin/bash
# Script para probar la conexión con webhooks de ChatGPT

echo "🔍 Testing ChatGPT Webhook Connection..."

# Simular webhook de ChatGPT
curl -X POST http://localhost:3000/webhook/chatgpt \
  -H "Content-Type: application/json" \
  -H "X-Event-Type: message.created" \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -H "X-Webhook-Signature: sha256=test-signature" \
  -d '{
    "message": {
      "id": "msg_test_123",
      "conversation_id": "conv_test_123", 
      "role": "user",
      "content": "Hello from ChatGPT!",
      "parts": "Hello from ChatGPT!",
      "create_time": '$(date +%s)',
      "author": {
        "name": "Test User",
        "role": "user"
      }
    },
    "conversation": {
      "id": "conv_test_123",
      "title": "Test Conversation",
      "model": "gpt-4",
      "create_time": '$(date +%s)',
      "update_time": '$(date +%s)'
    }
  }'

echo -e "\n✅ Webhook test completed!"