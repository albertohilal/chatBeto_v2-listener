# ChatBETO Listener

A webhook service for automatically syncing ChatGPT conversations to the ChatBETO database.

## 🎯 Purpose

This service listens for webhook events from ChatGPT and automatically synchronizes conversations and messages to the ChatBETO database in real-time.

## 🏗️ Architecture

- **Express.js** server with security middleware
- **MySQL** connection to ChatBETO database  
- **Webhook validation** with HMAC signatures
- **Rate limiting** and authentication
- **Comprehensive logging** and monitoring
- **Docker containerization** for easy deployment

## 🚀 Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development Mode

```bash
npm run dev
```

### 4. Production Mode

```bash
npm start
```

## 🐳 Docker Deployment

### Build and Run

```bash
docker-compose up -d
```

### Build Only

```bash
npm run docker:build
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### ChatGPT Webhook
```
POST /webhook/chatgpt
Headers:
  X-Webhook-Signature: sha256=<signature>
  X-Webhook-Timestamp: <unix_timestamp>
  X-Event-Type: <event_type>
```

### Manual Sync
```
POST /sync/manual
Headers:
  X-API-Key: <your_api_key>
```

## 🔐 Security

- HMAC signature validation for webhooks
- API key authentication for manual endpoints
- Rate limiting (100 requests per 15 minutes)
- Security headers (helmet.js)
- Request size limits (10MB)
- CORS configuration

## 📊 Monitoring

- Health check endpoint
- Comprehensive logging with Winston
- Memory usage monitoring
- Database connection monitoring
- Request/response logging

## 🧪 Testing

```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## 📝 Logging

Logs are written to:
- Console (development)
- `./logs/app.log` (all logs)
- `./logs/error.log` (errors only)

## 🔧 Configuration

All configuration is managed through environment variables. See `.env.example` for available options.

### Required Variables

- `DB_HOST` - Database host
- `DB_NAME` - Database name  
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret
- `WEBHOOK_SECRET` - Webhook validation secret

## 📋 Project Structure

```
chatBETO-listener/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication & validation
│   ├── services/        # Business logic & database
│   ├── utils/          # Helper functions
│   └── routes/         # Route definitions
├── config/             # Configuration files
├── tests/              # Test files
├── logs/               # Log files
├── Dockerfile          # Container definition
├── docker-compose.yml  # Multi-container setup
└── server.js           # Application entry point
```

## 🚀 Deployment on Contabo

1. **Clone repository on server**
2. **Copy `.env.example` to `.env`** and configure
3. **Run with Docker Compose**: `docker-compose up -d`
4. **Configure webhook URL** in ChatGPT settings
5. **Monitor logs**: `docker-compose logs -f`

## 🔗 Integration with ChatBETO

This service automatically syncs data to the same MySQL database used by the ChatBETO web interface at http://diarioiuna12.ar.nf/chatBeto/

## 👨‍💻 Development

- **Node.js 18+** required
- **MySQL 8.0+** for database
- **Docker** for containerization
- **Jest** for testing

## 📄 License

MIT License - see LICENSE file for details