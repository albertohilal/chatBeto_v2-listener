# Deployment Guide

## Contabo VPS Deployment

### Prerequisites

1. **Contabo VPS** with Ubuntu 20.04+ or similar
2. **Docker** and **Docker Compose** installed
3. **Domain or IP** for webhook URL
4. **SSL certificate** (recommended for production)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
```

### Step 2: Project Setup

```bash
# Clone repository
git clone https://github.com/yourusername/chatBETO-listener.git
cd chatBETO-listener

# Setup environment
cp .env.example .env
nano .env  # Edit configuration
```

### Step 3: Environment Configuration

Edit `.env` file with production values:

```bash
# Server
NODE_ENV=production
PORT=3000
API_BASE_URL=https://your-domain.com

# Database (ChatBETO database)
DB_HOST=sv46.byethost46.org
DB_PORT=3306
DB_NAME=iunaorg_chatBeto
DB_USER=iunaorg_b3toh
DB_PASSWORD=tu-password-real-aqui

# Security (GENERATE NEW SECRETS!)
JWT_SECRET=your-super-secure-jwt-secret-256-bits
WEBHOOK_SECRET=your-webhook-secret-for-chatgpt
API_KEY=your-internal-api-key-for-manual-sync

# OpenAI (Optional)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ORG_ID=org-your-organization-id
```

### Step 4: Deploy with Docker

```bash
cd scripts/deployment
./deploy.sh
```

Or manually:

```bash
docker-compose up -d --build
```

### Step 5: Configure Reverse Proxy (Recommended)

#### Option A: Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Option B: Cloudflare Tunnel

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Setup tunnel
cloudflared tunnel create chatbeto-listener
cloudflared tunnel route dns chatbeto-listener your-domain.com
```

### Step 6: Configure ChatGPT Webhook

1. Go to ChatGPT settings
2. Add webhook URL: `https://your-domain.com/webhook/chatgpt`
3. Configure events: `conversation.created`, `message.created`
4. Add webhook secret (same as in `.env`)

### Step 7: Monitoring

#### Health Checks
```bash
# Manual check
./scripts/utils/health-check.sh

# Continuous monitoring
watch -n 30 './scripts/utils/health-check.sh'
```

#### Logs
```bash
# Application logs
docker-compose logs -f chatbeto-listener

# System logs
sudo journalctl -u docker -f
```

#### Metrics
```bash
# Container stats
docker stats chatbeto-listener

# System resources
htop
```

## Production Checklist

### Security
- [ ] Generated new JWT_SECRET (256 bits)
- [ ] Generated new WEBHOOK_SECRET
- [ ] Generated new API_KEY
- [ ] Configured firewall (only ports 22, 80, 443)
- [ ] SSL certificate installed
- [ ] Database credentials secured

### Configuration
- [ ] NODE_ENV=production
- [ ] Correct API_BASE_URL
- [ ] Database connection tested
- [ ] Rate limits configured
- [ ] Logging level set to 'info'

### Monitoring
- [ ] Health check endpoint accessible
- [ ] Log files rotating properly
- [ ] Memory usage monitored
- [ ] Disk space monitored
- [ ] Alerts configured

### Backup
- [ ] Database backup strategy
- [ ] Configuration files backed up
- [ ] Container images tagged
- [ ] Recovery procedure documented

## Troubleshooting

### Common Issues

#### Container won't start
```bash
# Check logs
docker-compose logs chatbeto-listener

# Check configuration
docker-compose config
```

#### Database connection failed
```bash
# Test database connection
mysql -h sv46.byethost46.org -u iunaorg_b3toh -p iunaorg_chatBeto

# Check network connectivity
ping sv46.byethost46.org
```

#### Webhook signature validation fails
1. Verify WEBHOOK_SECRET matches ChatGPT configuration
2. Check timestamp tolerance (5 minutes max)
3. Verify request body is not modified

#### High memory usage
1. Check for memory leaks in logs
2. Restart container: `docker-compose restart`
3. Monitor with: `docker stats`

### Performance Optimization

#### Database Connection Pool
```javascript
// config/config.js
database: {
  connectionLimit: 20,      // Increase for high traffic
  acquireTimeout: 30000,    // Reduce timeout
  timeout: 30000,
  reconnect: true
}
```

#### Rate Limiting
```javascript
// Adjust based on expected traffic
rateLimit: {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 200           // Increase limit
}
```

### Scaling

#### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  chatbeto-listener:
    deploy:
      replicas: 3
    
  nginx:
    image: nginx:alpine
    # Load balancer configuration
```

#### Database Optimization
- Use connection pooling
- Optimize MySQL configuration
- Consider read replicas for high load

## Maintenance

### Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build --force-recreate
```

### Backup
```bash
# Backup configuration
tar -czf chatbeto-listener-config-$(date +%Y%m%d).tar.gz .env config/

# Backup logs
tar -czf chatbeto-listener-logs-$(date +%Y%m%d).tar.gz logs/
```

### Log Rotation
```bash
# Add to crontab
0 2 * * * docker exec chatbeto-listener find /app/logs -name "*.log" -mtime +7 -delete
```