const express = require('express');
const rateLimit = require('express-rate-limit');
const openaiController = require('../controllers/openai');
const { validateApiKey } = require('../middleware/auth');
const config = require('../../config/config');

const router = express.Router();

// Rate limiting for OpenAI endpoints
const openaiRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.maxRequests / 2), // More restrictive
  message: {
    error: 'Too many OpenAI requests',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

// All OpenAI routes require API key authentication
router.use(validateApiKey);
router.use(openaiRateLimit);

// OpenAI service status
router.get('/status', openaiController.getStatus);

// Create new conversation
router.post('/conversations', openaiController.createConversation);

// Get conversation with messages
router.get('/conversations/:conversationId', openaiController.getConversation);

// Send message to conversation
router.post('/conversations/:threadId/messages', openaiController.sendMessage);

// Direct chat completion
router.post('/chat/completions', openaiController.chatCompletion);

// Sync existing conversations
router.post('/sync', openaiController.syncConversations);

module.exports = router;