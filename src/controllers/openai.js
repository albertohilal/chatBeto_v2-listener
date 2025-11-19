const openaiService = require('../services/openai');
const logger = require('../services/logger');
const database = require('../services/database');

class OpenAIController {

  // Create new conversation with OpenAI
  async createConversation(req, res) {
    try {
      const { projectId, initialMessage, title } = req.body;

      if (!projectId) {
        return res.status(400).json({
          error: 'Project ID is required'
        });
      }

      // Check if project exists
      const project = await database.query(
        'SELECT * FROM projects WHERE id = ?',
        [projectId]
      );

      if (project.length === 0) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      // Create conversation with OpenAI
      const result = await openaiService.createConversation(projectId, initialMessage);

      // Update title if provided
      if (title) {
        await database.query(
          'UPDATE conversations SET title = ? WHERE conversation_id = ?',
          [title, result.conversationId]
        );
      }

      logger.logSync('conversation_created_via_api', {
        conversationId: result.conversationId,
        projectId,
        hasInitialMessage: !!initialMessage
      });

      res.status(201).json({
        status: 'success',
        data: {
          conversationId: result.conversationId,
          threadId: result.threadId,
          projectId
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error creating OpenAI conversation:', error);
      res.status(500).json({
        error: 'Failed to create conversation',
        message: error.message
      });
    }
  }

  // Send message and get response
  async sendMessage(req, res) {
    try {
      const { threadId } = req.params;
      const { message, role = 'user' } = req.body;

      if (!message) {
        return res.status(400).json({
          error: 'Message content is required'
        });
      }

      // Add user message
      const userMessage = await openaiService.addMessage(threadId, role, message);

      // Get assistant response if it's a user message
      let assistantResponse = null;
      if (role === 'user') {
        try {
          assistantResponse = await openaiService.getAssistantResponse(threadId);
        } catch (error) {
          logger.warn('Failed to get assistant response:', error.message);
        }
      }

      logger.logSync('message_sent_via_api', {
        threadId,
        messageId: userMessage.id,
        role,
        hasResponse: !!assistantResponse
      });

      res.status(200).json({
        status: 'success',
        data: {
          userMessage: {
            id: userMessage.id,
            content: message,
            role: role
          },
          assistantResponse: assistantResponse ? {
            content: assistantResponse,
            role: 'assistant'
          } : null
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({
        error: 'Failed to send message',
        message: error.message
      });
    }
  }

  // Get conversation messages
  async getConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Get conversation details
      const conversation = await database.query(
        'SELECT * FROM conversations WHERE conversation_id = ?',
        [conversationId]
      );

      if (conversation.length === 0) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }

      // Get messages
      const messages = await database.query(`
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY create_time ASC 
        LIMIT ? OFFSET ?
      `, [conversationId, parseInt(limit), parseInt(offset)]);

      // Format messages
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        parts: msg.parts ? JSON.parse(msg.parts) : null,
        create_time: msg.create_time,
        author_name: msg.author_name
      }));

      res.status(200).json({
        status: 'success',
        data: {
          conversation: conversation[0],
          messages: formattedMessages,
          pagination: {
            total: messages.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting conversation:', error);
      res.status(500).json({
        error: 'Failed to get conversation',
        message: error.message
      });
    }
  }

  // Sync existing conversations with OpenAI
  async syncConversations(req, res) {
    try {
      logger.info('🔄 Starting OpenAI sync via API...');
      
      // Run sync in background
      openaiService.syncExistingConversations()
        .catch(error => {
          logger.error('Background sync failed:', error);
        });

      res.status(202).json({
        status: 'accepted',
        message: 'Sync started in background',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error starting sync:', error);
      res.status(500).json({
        error: 'Failed to start sync',
        message: error.message
      });
    }
  }

  // Get OpenAI service status
  async getStatus(req, res) {
    try {
      const health = await openaiService.healthCheck();
      
      res.status(200).json({
        status: 'success',
        data: {
          openai: health,
          initialized: openaiService.initialized
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error getting OpenAI status:', error);
      res.status(500).json({
        error: 'Failed to get status',
        message: error.message
      });
    }
  }

  // Chat completion (direct OpenAI API)
  async chatCompletion(req, res) {
    try {
      const { messages, model = 'gpt-4', projectId } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Messages array is required'
        });
      }

      // Create conversation if projectId is provided
      let conversationId = null;
      if (projectId) {
        const result = await openaiService.createConversation(projectId);
        conversationId = result.conversationId;

        // Save messages to conversation
        for (const msg of messages) {
          await openaiService.addMessage(conversationId, msg.role, msg.content);
        }
      }

      // Get completion
      const completion = await openaiService.client.chat.completions.create({
        model,
        messages
      });

      const response = completion.choices[0].message;

      // Save assistant response if we have a conversation
      if (conversationId) {
        await openaiService.addMessage(conversationId, 'assistant', response.content);
      }

      logger.logSync('chat_completion_via_api', {
        model,
        conversationId,
        messagesCount: messages.length
      });

      res.status(200).json({
        status: 'success',
        data: {
          response: response,
          conversationId,
          usage: completion.usage
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in chat completion:', error);
      res.status(500).json({
        error: 'Failed to get completion',
        message: error.message
      });
    }
  }
}

module.exports = new OpenAIController();