#!/bin/bash
# Script para probar la integración con OpenAI API

echo "🤖 Testing OpenAI Integration..."

BASE_URL="http://localhost:3000/api/v1"
API_KEY="dev-internal-api-key-change-in-production"

# Test 1: Check OpenAI Status
echo "📊 1. Checking OpenAI status..."
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/openai/status" | jq '.'

echo -e "\n"

# Test 2: Create Conversation
echo "💬 2. Creating conversation..."
CONVERSATION_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -X POST "$BASE_URL/openai/conversations" \
  -d '{
    "projectId": 1,
    "title": "Test OpenAI Integration",
    "initialMessage": "Hello, this is a test from ChatBETO-listener!"
  }')

echo "$CONVERSATION_RESPONSE" | jq '.'

# Extract conversation ID for next tests
THREAD_ID=$(echo "$CONVERSATION_RESPONSE" | jq -r '.data.threadId // empty')

if [ -n "$THREAD_ID" ]; then
  echo -e "\n"
  
  # Test 3: Send Message
  echo "📝 3. Sending message to conversation..."
  curl -s -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -X POST "$BASE_URL/openai/conversations/$THREAD_ID/messages" \
    -d '{
      "message": "Can you help me understand how ChatBETO works?",
      "role": "user"
    }' | jq '.'
    
  echo -e "\n"
  
  # Test 4: Get Conversation
  echo "📖 4. Getting conversation messages..."
  curl -s -H "X-API-Key: $API_KEY" \
    "$BASE_URL/openai/conversations/$THREAD_ID" | jq '.'
fi

echo -e "\n"

# Test 5: Direct Chat Completion
echo "🚀 5. Testing direct chat completion..."
curl -s -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -X POST "$BASE_URL/openai/chat/completions" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is ChatBETO?"}
    ],
    "model": "gpt-3.5-turbo",
    "projectId": 1
  }' | jq '.'

echo -e "\n✅ OpenAI integration test completed!"