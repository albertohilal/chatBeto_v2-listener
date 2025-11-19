const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const logger = require('../services/logger');

// Validate webhook signature
const validateWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    if (!signature || !timestamp) {
      logger.warn('Missing webhook signature or timestamp');
      return res.status(401).json({ error: 'Missing signature or timestamp' });
    }

    // Check timestamp to prevent replay attacks (5 minutes tolerance)
    const now = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    
    if (Math.abs(now - webhookTime) > 300) {
      logger.warn('Webhook timestamp too old', { timestamp, now });
      return res.status(401).json({ error: 'Request too old' });
    }

    // Validate signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.security.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    if (!crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    logger.error('Webhook signature validation error:', error);
    res.status(500).json({ error: 'Signature validation failed' });
  }
};

// Validate API key for internal endpoints
const validateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const cleanApiKey = apiKey.replace('Bearer ', '').replace('ApiKey ', '');
    
    if (cleanApiKey !== config.security.apiKey) {
      logger.warn('Invalid API key attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
  } catch (error) {
    logger.error('API key validation error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Validate JWT token
const validateJWT = (req, res, next) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Missing JWT token' });
    }

    const decoded = jwt.verify(token, config.security.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid JWT token', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Generate JWT token (utility function)
const generateJWT = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, config.security.jwtSecret, { expiresIn });
};

// CORS middleware
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = [
    'http://diarioiuna12.ar.nf',
    'https://diarioiuna12.ar.nf',
    'http://localhost:3000',
    'http://localhost:8080'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Webhook-Signature, X-Webhook-Timestamp');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }

  // Check request size (10MB limit)
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'Request too large' });
  }

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't expose internal errors in production
  if (config.server.nodeEnv === 'production') {
    return res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }

  res.status(500).json({
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.removeHeader('X-Powered-By');
  next();
};

module.exports = {
  validateWebhookSignature,
  validateApiKey,
  validateJWT,
  generateJWT,
  corsMiddleware,
  validateRequest,
  errorHandler,
  securityHeaders
};