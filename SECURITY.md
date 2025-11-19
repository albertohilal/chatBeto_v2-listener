# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it privately to:
- Create an issue marked as "Security" 
- Or contact directly via GitHub

## Security Practices

### Environment Variables
- **NEVER** commit `.env` files to version control
- Use `.env.example` as template with placeholder values
- Generate new secrets for production deployments

### Required Security Changes for Production

#### 1. Generate New Secrets
```bash
# JWT Secret (256 bits)
openssl rand -hex 32

# Webhook Secret  
openssl rand -hex 16

# API Key
openssl rand -hex 24
```

#### 2. Database Security
- Change default database password
- Use strong credentials (min 16 characters)
- Enable SSL connections if available

#### 3. OpenAI API Keys
- Use separate API keys for development/production
- Set spending limits on OpenAI dashboard
- Monitor API usage regularly

### Deployment Checklist

- [ ] Generated new JWT_SECRET (256 bits)
- [ ] Generated new WEBHOOK_SECRET
- [ ] Generated new API_KEY
- [ ] Changed database password
- [ ] Added OpenAI API key with limits
- [ ] Verified .env is in .gitignore
- [ ] SSL/TLS enabled for production
- [ ] Rate limiting configured
- [ ] Monitoring and logging enabled

## Dependencies

Keep dependencies updated:
```bash
npm audit
npm update
```

## Contact

For security concerns, contact the maintainer through GitHub issues.