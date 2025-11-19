# ChatBETO Listener 🎧

> Webhook service for real-time ChatGPT conversation synchronization

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-blue)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-orange)](https://mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Development mode
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/health` | GET | Health check | None |
| `/webhook/chatgpt` | POST | ChatGPT webhook | Signature |
| `/sync/manual` | POST | Manual sync | API Key |

## 🐳 Docker Deployment

```bash
cd scripts/deployment
docker-compose up -d
```

## 📊 Status

- ✅ Database connection
- ✅ Webhook endpoints
- ✅ Authentication & security
- ✅ Rate limiting
- ✅ Logging & monitoring
- ✅ Docker containerization

## 📚 Documentation

- [Detailed Documentation](./docs/README.md)
- [API Reference](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

## 🔗 Integration

Automatically syncs with [ChatBETO Web Interface](http://diarioiuna12.ar.nf/chatBeto/)

---

**Built for the ChatBETO ecosystem** 🤖