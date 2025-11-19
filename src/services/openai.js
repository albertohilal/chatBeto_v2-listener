const { OpenAI } = require('openai');
const logger = require('./logger');
const database = require('./database');

class OpenAIService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not found. OpenAI integration disabled.');
        return false;
      }

      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID || undefined
      });

      // Test connection
      await this.testConnection();
      
      this.initialized = true;
      logger.info('✅ OpenAI service initialized successfully');
      return true;

    } catch (error) {
      logger.error('❌ Failed to initialize OpenAI service:', error);
      return false;
    }
  }

  async testConnection() {
    try {
      const response = await this.client.models.list();
      logger.info('🔍 OpenAI connection test successful');
      return true;
    } catch (error) {
      logger.error('❌ OpenAI connection test failed:', error);
      throw error;
    }
  }

  async createConversation(projectId, initialMessage = null) {
    if (!this.initialized) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      // Create thread in OpenAI
      const thread = await this.client.beta.threads.create();
      
      // Save to database
      const conversationData = {
        conversation_id: thread.id,
        title: 'New Conversation',
        model: 'gpt-4',
        create_time: new Date(),
        update_time: new Date(),
        project_id: projectId,
        openai_thread_id: thread.id
      };

      await database.insertConversation(conversationData);

      // Add initial message if provided
      if (initialMessage) {
        await this.addMessage(thread.id, 'user', initialMessage);
      }

      logger.logSync('openai_conversation_created', {
        threadId: thread.id,
        projectId
      });

      return {
        threadId: thread.id,
        conversationId: thread.id
      };

    } catch (error) {
      logger.error('Error creating OpenAI conversation:', error);
      throw error;
    }
  }

  async addMessage(threadId, role, content) {
    if (!this.initialized) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      // Add message to OpenAI thread
      const message = await this.client.beta.threads.messages.create(
        threadId,
        {
          role: role,
          content: content
        }
      );

      // Save to database
      const messageData = {
        id: message.id,
        conversation_id: threadId,
        role: role,
        content: content,
        parts: JSON.stringify([content]),
        create_time: new Date(message.created_at * 1000),
        parent: null,
        children: null,
        author_name: role === 'user' ? 'User' : 'Assistant'
      };

      await database.insertMessage(messageData);

      logger.logSync('openai_message_added', {
        messageId: message.id,
        threadId,
        role
      });

      return message;

    } catch (error) {
      logger.error('Error adding message to OpenAI:', error);
      throw error;
    }
  }

  async getAssistantResponse(threadId, assistantId = null) {
    if (!this.initialized) {
      throw new Error('OpenAI service not initialized');
    }

    try {
      // Create run
      const run = await this.client.beta.threads.runs.create(
        threadId,
        {
          assistant_id: assistantId || await this.getDefaultAssistant()
        }
      );

      // Wait for completion
      let runStatus = await this.client.beta.threads.runs.retrieve(threadId, run.id);
      
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.client.beta.threads.runs.retrieve(threadId, run.id);
      }

      if (runStatus.status === 'completed') {
        // Get the assistant's response
        const messages = await this.client.beta.threads.messages.list(threadId);
        const assistantMessage = messages.data[0];

        if (assistantMessage.role === 'assistant') {
          // Save assistant response to database
          await this.addMessage(threadId, 'assistant', assistantMessage.content[0].text.value);
          
          return assistantMessage.content[0].text.value;
        }
      }

      throw new Error(`Run failed with status: ${runStatus.status}`);

    } catch (error) {
      logger.error('Error getting assistant response:', error);
      throw error;
    }
  }

  async getDefaultAssistant() {
    // You can create a default assistant or use a specific one
    const assistants = await this.client.beta.assistants.list();
    
    if (assistants.data.length > 0) {
      return assistants.data[0].id;
    }

    // Create a default assistant if none exists
    const assistant = await this.client.beta.assistants.create({
      name: "ChatBETO Assistant",
      instructions: "You are a helpful assistant for the ChatBETO project.",
      model: "gpt-4"
    });

    return assistant.id;
  }

  async syncExistingConversations() {
    if (!this.initialized) {
      logger.warn('OpenAI service not initialized. Skipping sync.');
      return;
    }

    try {
      // Get conversations from database that need OpenAI thread
      const conversations = await database.query(`
        SELECT * FROM conversations 
        WHERE openai_thread_id IS NULL 
        LIMIT 10
      `);

      logger.info(`🔄 Syncing ${conversations.length} conversations with OpenAI...`);

      for (const conv of conversations) {
        try {
          // Create thread for existing conversation
          const thread = await this.client.beta.threads.create();
          
          // Update conversation with thread ID
          await database.query(`
            UPDATE conversations 
            SET openai_thread_id = ? 
            WHERE conversation_id = ?
          `, [thread.id, conv.conversation_id]);

          // Get messages for this conversation
          const messages = await database.query(`
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            ORDER BY create_time ASC
          `, [conv.conversation_id]);

          // Add messages to OpenAI thread
          for (const msg of messages) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              try {
                const content = msg.parts ? JSON.parse(msg.parts) : msg.content;
                const textContent = Array.isArray(content) ? content.join(' ') : content;
                
                await this.client.beta.threads.messages.create(
                  thread.id,
                  {
                    role: msg.role,
                    content: textContent || 'Empty message'
                  }
                );
              } catch (msgError) {
                logger.warn(`Failed to sync message ${msg.id}:`, msgError.message);
              }
            }
          }

          logger.logSync('conversation_synced_to_openai', {
            conversationId: conv.conversation_id,
            threadId: thread.id,
            messagesCount: messages.length
          });

        } catch (convError) {
          logger.error(`Failed to sync conversation ${conv.conversation_id}:`, convError);
        }
      }

      logger.info('✅ OpenAI sync completed');

    } catch (error) {
      logger.error('Error syncing conversations with OpenAI:', error);
    }
  }

  async healthCheck() {
    if (!this.initialized) {
      return { status: 'disabled', reason: 'Not initialized' };
    }

    try {
      await this.testConnection();
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message 
      };
    }
  }
}

module.exports = new OpenAIService();