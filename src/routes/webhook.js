const express = require('express');
const rateLimit = require('express-rate-limit');
const webhookController = require('../controllers/webhook');
const { validateWebhookSignature, validateApiKey } = require('../middleware/auth');
const config = require('../../config/config');

const router = express.Router();

// Rate limiting for webhook endpoints
const webhookRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many webhook requests',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for manual endpoints (more restrictive)
const manualRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.maxRequests / 2),
  message: {
    error: 'Too many manual requests',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Health check endpoint (no authentication required)
router.get('/health', webhookController.healthCheck);

// Public endpoint info
router.get('/', (req, res) => {
  res.json({
    service: 'ChatBETO Listener',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      webhook: 'POST /webhook/chatgpt',
      manual_sync: 'POST /sync/manual',
      openai: {
        status: 'GET /api/v1/openai/status',
        conversations: 'POST /api/v1/openai/conversations',
        messages: 'POST /api/v1/openai/conversations/:threadId/messages',
        chat: 'POST /api/v1/openai/chat/completions',
        sync: 'POST /api/v1/openai/sync'
      }
    }
  });
});

// ChatGPT webhook endpoint
router.post('/webhook/chatgpt', 
  webhookRateLimit,
  validateWebhookSignature,
  webhookController.handleChatGPTWebhook
);

// Manual sync endpoint (protected with API key)
router.post('/sync/manual',
  manualRateLimit,
  validateApiKey,
  webhookController.manualSync
);

// Test endpoint for webhook validation (development only)
if (config.server.nodeEnv === 'development') {
  router.post('/test/webhook',
    validateApiKey,
    (req, res) => {
      res.json({
        message: 'Webhook test endpoint',
        headers: req.headers,
        body: req.body,
        timestamp: new Date().toISOString()
      });
    }
  );
}

module.exports = router;