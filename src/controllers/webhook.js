const logger = require('../services/logger');
const database = require('../services/database');
const { validateWebhookPayload } = require('../utils/validation');

class WebhookController {
  
  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const dbHealth = await database.healthCheck();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbHealth
      };

      const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
      
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Main webhook endpoint for ChatGPT events
  async handleChatGPTWebhook(req, res) {
    try {
      const payload = req.body;
      const eventType = req.headers['x-event-type'] || 'unknown';
      
      logger.logWebhook(eventType, payload, {
        headers: req.headers,
        ip: req.ip
      });

      // Validate payload structure
      const validation = validateWebhookPayload(payload);
      if (!validation.isValid) {
        logger.error('Invalid webhook payload:', validation.errors);
        return res.status(400).json({
          error: 'Invalid payload',
          details: validation.errors
        });
      }

      // Process the webhook based on event type
      let result;
      switch (eventType) {
        case 'conversation.created':
          result = await this.handleConversationCreated(payload);
          break;
        case 'conversation.updated':
          result = await this.handleConversationUpdated(payload);
          break;
        case 'message.created':
          result = await this.handleMessageCreated(payload);
          break;
        case 'message.updated':
          result = await this.handleMessageUpdated(payload);
          break;
        default:
          logger.warn(`Unhandled event type: ${eventType}`);
          result = { status: 'ignored', eventType };
      }

      res.status(200).json({
        status: 'success',
        eventType,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle conversation creation
  async handleConversationCreated(payload) {
    const { conversation, project } = payload;
    
    try {
      // Ensure project exists
      if (project) {
        const existingProject = await database.getProject(project.name);
        if (!existingProject) {
          await database.createProject({
            name: project.name,
            description: project.description || '',
            chatgpt_project_id: project.id
          });
          logger.logDatabase('project_created', { projectName: project.name });
        }
      }

      // Insert conversation
      await database.insertConversation({
        conversation_id: conversation.id,
        title: conversation.title || 'Untitled',
        model: conversation.model || 'gpt-4',
        create_time: new Date(conversation.create_time * 1000),
        update_time: new Date(conversation.update_time * 1000),
        project_id: project ? project.id : null,
        openai_thread_id: conversation.openai_thread_id || null
      });

      logger.logSync('conversation_created', {
        conversationId: conversation.id,
        title: conversation.title
      });

      return { status: 'conversation_created', conversationId: conversation.id };

    } catch (error) {
      logger.error('Error handling conversation creation:', error);
      throw error;
    }
  }

  // Handle conversation updates
  async handleConversationUpdated(payload) {
    const { conversation } = payload;
    
    try {
      await database.insertConversation({
        conversation_id: conversation.id,
        title: conversation.title || 'Untitled',
        model: conversation.model || 'gpt-4',
        create_time: new Date(conversation.create_time * 1000),
        update_time: new Date(conversation.update_time * 1000),
        project_id: conversation.project_id || null,
        openai_thread_id: conversation.openai_thread_id || null
      });

      logger.logSync('conversation_updated', {
        conversationId: conversation.id,
        title: conversation.title
      });

      return { status: 'conversation_updated', conversationId: conversation.id };

    } catch (error) {
      logger.error('Error handling conversation update:', error);
      throw error;
    }
  }

  // Handle message creation
  async handleMessageCreated(payload) {
    const { message, conversation } = payload;
    
    try {
      // Ensure conversation exists
      if (conversation) {
        const existingConv = await database.getConversation(conversation.id);
        if (!existingConv) {
          await this.handleConversationCreated({ conversation });
        }
      }

      // Insert message
      await database.insertMessage({
        id: message.id,
        conversation_id: message.conversation_id || conversation?.id,
        role: message.role || 'user',
        content: message.content ? JSON.stringify(message.content) : null,
        parts: message.parts ? JSON.stringify(message.parts) : null,
        create_time: new Date(message.create_time * 1000),
        parent: message.parent || null,
        children: message.children ? JSON.stringify(message.children) : null,
        author_name: message.author?.name || null
      });

      logger.logSync('message_created', {
        messageId: message.id,
        conversationId: message.conversation_id,
        role: message.role
      });

      return { status: 'message_created', messageId: message.id };

    } catch (error) {
      logger.error('Error handling message creation:', error);
      throw error;
    }
  }

  // Handle message updates
  async handleMessageUpdated(payload) {
    const { message } = payload;
    
    try {
      await database.insertMessage({
        id: message.id,
        conversation_id: message.conversation_id,
        role: message.role || 'user',
        content: message.content ? JSON.stringify(message.content) : null,
        parts: message.parts ? JSON.stringify(message.parts) : null,
        create_time: new Date(message.create_time * 1000),
        parent: message.parent || null,
        children: message.children ? JSON.stringify(message.children) : null,
        author_name: message.author?.name || null
      });

      logger.logSync('message_updated', {
        messageId: message.id,
        conversationId: message.conversation_id
      });

      return { status: 'message_updated', messageId: message.id };

    } catch (error) {
      logger.error('Error handling message update:', error);
      throw error;
    }
  }

  // Manual sync endpoint
  async manualSync(req, res) {
    try {
      const { type, data } = req.body;
      
      logger.logSync('manual_sync_started', { type });

      let result;
      switch (type) {
        case 'conversation':
          result = await this.handleConversationCreated(data);
          break;
        case 'message':
          result = await this.handleMessageCreated(data);
          break;
        default:
          return res.status(400).json({ error: 'Invalid sync type' });
      }

      res.status(200).json({
        status: 'success',
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Manual sync error:', error);
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  }
}

module.exports = new WebhookController();