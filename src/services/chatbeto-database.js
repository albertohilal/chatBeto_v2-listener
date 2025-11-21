const mysql = require('mysql2/promise');
const config = require('../../config/config');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

/**
 * CORRECCIONES IMPLEMENTADAS - ChatBETO Database Functions
 * ========================================================
 * 
 * OBJETIVO: Corregir el módulo que inserta y consulta conversaciones y mensajes para que:
 * 1. Al insertar, el campo "mensaje" almacene el contenido real del chat (NO el título)
 * 2. La consulta del reporte "Buscar Mensajes en Chat" devuelva correctamente:
 *    - título de la conversación (conversation.title)
 *    - rol del emisor del mensaje (message.role)
 *    - contenido del mensaje (message.content)
 *    - fecha/hora del mensaje (message.created_at)
 * 3. Mapeo correcto entre tablas: conversations ↔ messages (uno-a-muchos)
 * 
 * CAMBIOS REALIZADOS:
 * - Función insertMessage: ahora distingue claramente entre título y contenido
 * - Función getMessagesForReport: query optimizada para reporte con todos los campos necesarios
 * - Función insertConversation: mejorada para evitar confusión title/content
 * - Uso de prepared statements para seguridad
 * - Validaciones de datos de entrada
 * - Manejo de errores mejorado
 */

class ChatBETODatabaseService {
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
        connectionLimit: config.database.connectionLimit || 10,
        queueLimit: 0,
        acquireTimeout: config.database.acquireTimeout || 60000,
        timeout: config.database.timeout || 60000,
        reconnect: config.database.reconnect || true,
        charset: 'utf8mb4'
      });

      await this.testConnection();
      logger.info('✅ ChatBETO Database connection pool initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize ChatBETO database connection:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      logger.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  /**
   * FUNCIÓN CORREGIDA: insertMessage
   * ================================
   * Inserta un mensaje en la tabla messages con el CONTENIDO REAL del chat
   * (no confunde título con contenido)
   * 
   * @param {string} conversationId - UUID de la conversación
   * @param {string} role - Rol del emisor (user, assistant, system)
   * @param {string} content - CONTENIDO REAL del mensaje (no el título)
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado de la inserción
   */
  async insertMessage(conversationId, role, content, options = {}) {
    // Validaciones de entrada
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('conversationId es requerido y debe ser un string');
    }
    
    if (!role || !['user', 'assistant', 'system', 'tool'].includes(role)) {
      throw new Error('role debe ser uno de: user, assistant, system, tool');
    }
    
    if (!content || typeof content !== 'string') {
      throw new Error('content es requerido y debe ser un string no vacío');
    }

    // Limpiar contenido
    const cleanContent = content.trim();
    if (cleanContent.length === 0) {
      throw new Error('El contenido del mensaje no puede estar vacío');
    }

    try {
      // Generar ID único para el mensaje
      const messageId = options.id || uuidv4();
      const createTime = options.createTime || Date.now() / 1000;
      const authorName = options.authorName || null;
      const parentMessageId = options.parentMessageId || null;
      
      // SQL con prepared statement para seguridad
      // Ajuste de columnas a la estructura actual de la BD
      // Tabla `messages` usa: id, conversation_id, role, content, content_type, author_name,
      // parent_message_id, created_at_timestamp_ms, created_at, status
      const sql = `
        INSERT INTO messages (
          id,
          conversation_id,
          role,
          content,
          content_type,
          author_name,
          parent_message_id,
          created_at_timestamp_ms,
          created_at,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
          role = VALUES(role),
          content = VALUES(content),
          content_type = VALUES(content_type),
          author_name = VALUES(author_name),
          updated_at = NOW()
      `;

      const params = [
        messageId,
        conversationId,
        role,
        cleanContent,  // contenido real
        options.contentType || 'text',
        authorName,
        parentMessageId,
        createTime * 1000, // guardar en ms en created_at_timestamp_ms
        'finished_successfully'
      ];

      const [result] = await this.pool.execute(sql, params);
      
      logger.info(`✅ Mensaje insertado correctamente: ${messageId} en conversación ${conversationId}`);
      
      return {
        success: true,
        messageId: messageId,
        conversationId: conversationId,
        affectedRows: result.affectedRows,
        insertId: result.insertId
      };

    } catch (error) {
      logger.error('❌ Error al insertar mensaje:', {
        conversationId,
        role,
        contentLength: content.length,
        error: error.message
      });
      throw new Error(`Error al insertar mensaje: ${error.message}`);
    }
  }

  /**
   * FUNCIÓN CORREGIDA: getMessagesForReport
   * =======================================
   * Consulta optimizada para el reporte "Buscar Mensajes en Chat"
   * Devuelve CORRECTAMENTE:
   * - título de la conversación (conversation.title)
  * - rol del emisor (message.role)  
  * - contenido del mensaje (message.content)
   * - fecha/hora del mensaje (message.created_at)
   * 
   * @param {number} projectId - ID del proyecto (opcional)
   * @param {Object} filters - Filtros adicionales
   * @returns {Promise<Array>} Array de mensajes para el reporte
   */
  async getMessagesForReport(projectId = null, filters = {}) {
    try {
      let sql = `
        SELECT 
          -- Datos del mensaje (contenido real, NO título)
          m.id as message_id,
          m.role as message_role,
          m.content as message_content,  -- CONTENIDO REAL del mensaje
          m.created_at as message_created_at,
          m.created_at_timestamp_ms as message_timestamp,
          
          -- Datos de la conversación (título, NO contenido)
          c.id as conversation_id,
          c.title as conversation_title,      -- TÍTULO de la conversación
          c.created_at as conversation_created_at,
          
          -- Datos del proyecto
          p.id as project_id,
          p.name as project_name
          
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN projects p ON c.project_id = p.id
        WHERE 1=1
          AND m.content IS NOT NULL 
          AND m.content != ''
          AND m.content NOT LIKE '%[object Object]%'
          AND LENGTH(TRIM(m.content)) > 3
          AND m.role IN ('user', 'assistant', 'system')
      `;

      const params = [];

      // Filtro por proyecto si se especifica
      if (projectId && Number.isInteger(projectId)) {
        sql += ` AND c.project_id = ?`;
        params.push(projectId);
      }

      // Filtros adicionales
      if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
        sql += ` AND (
          m.content LIKE ? OR 
          c.title LIKE ? OR
          p.name LIKE ?
        )`;
        const searchPattern = `%${filters.searchQuery.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (filters.messageRole && ['user', 'assistant', 'system'].includes(filters.messageRole)) {
  sql += ` AND m.role = ?`;
        params.push(filters.messageRole);
      }

      if (filters.dateFrom) {
        sql += ` AND m.created_at >= ?`;
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        sql += ` AND m.created_at <= ?`;
        params.push(filters.dateTo);
      }

      // Ordenar por fecha del mensaje (más recientes primero)
      sql += ` 
        ORDER BY 
          COALESCE(m.created_at_timestamp_ms, UNIX_TIMESTAMP(m.created_at)*1000) DESC,
          m.created_at DESC
        LIMIT ?
      `;
      params.push(filters.limit || 100);

      const [results] = await this.pool.execute(sql, params);

      // Procesar y limpiar resultados
      const processedResults = results.map(row => ({
        // Información del mensaje
        message_id: row.message_id,
        message_role: row.message_role,
        message_content: this.cleanMessageContent(row.message_content), // CONTENIDO REAL limpio
        message_date: this.formatMessageDate(row.message_created_at, row.message_timestamp),
        
        // Información de la conversación  
        conversation_id: row.conversation_id,
        conversation_title: row.conversation_title || 'Sin título',  // TÍTULO de conversación
        conversation_date: row.conversation_created_at,
        
        // Información del proyecto
        project_id: row.project_id,
        project_name: row.project_name || 'Sin proyecto asignado'
      }));

      logger.info(`✅ Consulta de reporte completada: ${processedResults.length} mensajes encontrados`);
      
      return {
        success: true,
        messages: processedResults,
        total: processedResults.length,
        filters_applied: {
          projectId,
          ...filters
        }
      };

    } catch (error) {
      logger.error('❌ Error en consulta de reporte de mensajes:', {
        projectId,
        filters,
        error: error.message
      });
      throw new Error(`Error al obtener mensajes para reporte: ${error.message}`);
    }
  }

  /**
   * FUNCIÓN MEJORADA: insertConversation
   * ====================================
   * Versión mejorada que asegura que title = título y NO contenido
   * 
   * @param {Object} conversationData - Datos de la conversación
   * @returns {Promise<Object>} Resultado de la inserción
   */
  async insertConversation(conversationData) {
    const { 
      conversation_id, 
      title,          // TÍTULO de la conversación (NO contenido de mensajes)
      project_id, 
      model, 
      create_time, 
      update_time,
      openai_thread_id 
    } = conversationData;

    // Validaciones
    if (!conversation_id) {
      throw new Error('conversation_id es requerido');
    }
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('title es requerido y debe ser un string no vacío');
    }

    try {
      const cleanTitle = title.trim();
      
      const sql = `
        INSERT INTO conversations (
          id,
          conversation_id, 
          title,           -- TÍTULO de la conversación
          project_id, 
          default_model_slug,
          create_time, 
          update_time,
          created_at,
          openai_thread_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          project_id = VALUES(project_id),
          default_model_slug = VALUES(default_model_slug),
          update_time = VALUES(update_time),
          openai_thread_id = VALUES(openai_thread_id),
          updated_at = NOW()
      `;

      const conversationUuid = conversationData.id || uuidv4();
      
      const params = [
        conversationUuid,
        conversation_id,
        cleanTitle,         // TÍTULO limpio (NO contenido)
        project_id,
        model || 'gpt-4',
        create_time || Date.now() / 1000,
        update_time || Date.now() / 1000,
        openai_thread_id
      ];

      const [result] = await this.pool.execute(sql, params);
      
      logger.info(`✅ Conversación insertada: ${conversation_id} con título: "${cleanTitle}"`);
      
      return {
        success: true,
        conversationId: conversation_id,
        conversationUuid: conversationUuid,
        title: cleanTitle,
        affectedRows: result.affectedRows
      };

    } catch (error) {
      logger.error('❌ Error al insertar conversación:', {
        conversation_id,
        title: title?.substring(0, 100) + '...',
        error: error.message
      });
      throw new Error(`Error al insertar conversación: ${error.message}`);
    }
  }

  // Métodos utilitarios privados
  cleanMessageContent(content) {
    if (!content) return '';
    
    // Limpiar caracteres de control y asegurar UTF-8
    let cleaned = content.trim()
      .replace(/[\x00-\x1F\x7F]/g, '')  // Remover caracteres de control
      .replace(/\r\n/g, '\n')          // Normalizar saltos de línea
      .replace(/\r/g, '\n');           // Normalizar saltos de línea
    
    // Validar UTF-8
    try {
      cleaned = Buffer.from(cleaned, 'utf8').toString('utf8');
    } catch (e) {
      logger.warn('Contenido con encoding inválido, limpiando...');
      cleaned = cleaned.replace(/[^\x00-\x7F]/g, ''); // Solo ASCII seguro
    }
    
    return cleaned;
  }

  formatMessageDate(createdAt, createTime) {
    try {
      // createTime may be provided either as seconds (Unix epoch) or milliseconds.
      // created_at_timestamp_ms in the DB is stored in milliseconds.
      if (createTime && Number.isFinite(createTime)) {
        // Heuristic: if value looks like milliseconds (>= 1e12), use directly,
        // otherwise treat as seconds and convert to ms.
        const tsMs = createTime > 1e12 ? createTime : createTime * 1000;
        return new Date(tsMs).toISOString();
      }
      if (createdAt) {
        return new Date(createdAt).toISOString();
      }
      return new Date().toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('🔌 ChatBETO Database connection pool closed');
    }
  }
}

module.exports = new ChatBETODatabaseService();