const mysql = require('mysql2/promise');
const config = require('../../config/config');
const logger = require('./logger');

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
        waitForConnections: true,
        connectionLimit: config.database.connectionLimit,
        queueLimit: 0,
        acquireTimeout: config.database.acquireTimeout,
        timeout: config.database.timeout,
        reconnect: config.database.reconnect,
        charset: 'utf8mb4'
      });

      // Test connection
      await this.testConnection();
      logger.info('✅ Database connection pool initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize database connection:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      logger.info('🔍 Database connection test successful');
      return true;
    } catch (error) {
      logger.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      logger.error('❌ Database query error:', { sql, params, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('❌ Transaction rolled back:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Specific methods for ChatBETO operations
  async insertConversation(conversationData) {
    const { conversation_id, title, model, create_time, update_time, project_id, openai_thread_id } = conversationData;
    
    const sql = `
      INSERT INTO conversations (conversation_id, title, model, create_time, update_time, project_id, openai_thread_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        model = VALUES(model),
        update_time = VALUES(update_time),
        project_id = VALUES(project_id),
        openai_thread_id = VALUES(openai_thread_id)
    `;

    return await this.query(sql, [conversation_id, title, model, create_time, update_time, project_id, openai_thread_id]);
  }

  async insertMessage(messageData) {
    const { id, conversation_id, role, content, parts, create_time, parent, children, author_name } = messageData;
    
    const sql = `
      INSERT INTO messages (id, conversation_id, role, content, parts, create_time, parent, children, author_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        content = VALUES(content),
        parts = VALUES(parts),
        create_time = VALUES(create_time),
        parent = VALUES(parent),
        children = VALUES(children),
        author_name = VALUES(author_name)
    `;

    return await this.query(sql, [id, conversation_id, role, content, parts, create_time, parent, children, author_name]);
  }

  async getConversation(conversationId) {
    const sql = 'SELECT * FROM conversations WHERE conversation_id = ?';
    const results = await this.query(sql, [conversationId]);
    return results[0] || null;
  }

  async getProject(projectName) {
    const sql = 'SELECT * FROM projects WHERE name = ?';
    const results = await this.query(sql, [projectName]);
    return results[0] || null;
  }

  async createProject(projectData) {
    const { name, description, is_starred = false, chatgpt_project_id } = projectData;
    
    const sql = `
      INSERT INTO projects (name, description, is_starred, chatgpt_project_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        chatgpt_project_id = VALUES(chatgpt_project_id)
    `;

    return await this.query(sql, [name, description, is_starred, chatgpt_project_id]);
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('🔌 Database connection pool closed');
    }
  }

  // Health check method
  async healthCheck() {
    try {
      await this.testConnection();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }
}

module.exports = new DatabaseService();