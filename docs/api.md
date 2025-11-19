# API Reference

## Authentication

### Webhook Endpoints
Webhooks use HMAC-SHA256 signature validation:

```
Headers:
  X-Webhook-Signature: sha256=<hmac_signature>
  X-Webhook-Timestamp: <unix_timestamp>
  X-Event-Type: <event_type>
```

### Internal Endpoints
Internal endpoints require API key authentication:

```
Headers:
  X-API-Key: <your_api_key>
  # OR
  Authorization: Bearer <your_api_key>
```

## Endpoints

### Health Check
Check service health and database connectivity.

**Request:**
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 45,
    "heapTotal": 20,
    "heapUsed": 15,
    "external": 2
  },
  "database": {
    "status": "healthy",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
```

### ChatGPT Webhook
Receive real-time events from ChatGPT.

**Request:**
```
POST /webhook/chatgpt
Content-Type: application/json
X-Webhook-Signature: sha256=<signature>
X-Webhook-Timestamp: <timestamp>
X-Event-Type: conversation.created
```

**Event Types:**
- `conversation.created` - New conversation
- `conversation.updated` - Conversation modified
- `message.created` - New message
- `message.updated` - Message modified

**Response:**
```json
{
  "status": "success",
  "eventType": "conversation.created",
  "result": {
    "status": "conversation_created",
    "conversationId": "conv_123"
  },
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

### Manual Sync
Manually sync specific conversations or messages.

**Request:**
```
POST /sync/manual
Content-Type: application/json
X-API-Key: <your_api_key>

{
  "type": "conversation",
  "data": {
    "conversation": { /* conversation data */ },
    "project": { /* project data */ }
  }
}
```

**Types:**
- `conversation` - Sync conversation
- `message` - Sync message

**Response:**
```json
{
  "status": "success",
  "result": {
    "status": "conversation_created",
    "conversationId": "conv_123"
  },
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

## Data Models

### Conversation
```json
{
  "id": "conversation_uuid",
  "title": "Conversation title",
  "model": "gpt-4",
  "create_time": 1637123456,
  "update_time": 1637123456,
  "project_id": "project_uuid",
  "openai_thread_id": "thread_123"
}
```

### Message
```json
{
  "id": "message_uuid",
  "conversation_id": "conversation_uuid",
  "role": "user|assistant|system",
  "content": "Message content or JSON",
  "parts": "Message parts as JSON",
  "create_time": 1637123456,
  "parent": "parent_message_id",
  "children": ["child1", "child2"],
  "author": {
    "name": "User Name",
    "role": "user"
  }
}
```

### Project
```json
{
  "id": "project_uuid",
  "name": "Project Name",
  "description": "Project description",
  "is_starred": false,
  "chatgpt_project_id": "gpt_project_123"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid payload",
  "details": [
    {
      "field": "conversation.id",
      "message": "\"id\" is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid signature",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many webhook requests",
  "retryAfter": 900
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed",
  "timestamp": "2025-11-19T10:30:00.000Z"
}
```

## Rate Limits

- **Webhook endpoints**: 100 requests per 15 minutes
- **Manual endpoints**: 50 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Window reset time