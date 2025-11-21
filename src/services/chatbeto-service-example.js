/**
 * EJEMPLO DE USO - ChatBETO Database Functions
 * ===========================================
 * 
 * Este archivo muestra cómo usar las funciones corregidas para
 * insertar y consultar conversaciones y mensajes correctamente.
 */

const chatBETODatabase = require('./chatbeto-database');
const logger = require('./logger');

class ChatBETOService {
  constructor() {
    this.db = chatBETODatabase;
  }

  async initialize() {
    await this.db.initialize();
  }

  /**
   * EJEMPLO 1: Insertar una conversación completa con mensajes
   * =========================================================
   */
  async insertCompleteConversation(projectId, conversationTitle, messages) {
    try {
      // 1. Insertar la conversación con su TÍTULO (no contenido)
      const conversationResult = await this.db.insertConversation({
        conversation_id: `conv_${Date.now()}`,
        title: conversationTitle,  // TÍTULO de la conversación
        project_id: projectId,
        model: 'gpt-4',
        create_time: Date.now() / 1000,
        update_time: Date.now() / 1000
      });

      logger.info(`✅ Conversación creada: ${conversationResult.conversationId}`);
      
      // 2. Insertar cada mensaje con su CONTENIDO real
      const messageResults = [];
      
      for (const message of messages) {
        const messageResult = await this.db.insertMessage(
          conversationResult.conversationId,
          message.role,        // 'user', 'assistant', 'system'
          message.content,     // CONTENIDO REAL del mensaje (no título)
          {
            authorName: message.authorName,
            createTime: message.timestamp || Date.now() / 1000
          }
        );
        
        messageResults.push(messageResult);
        logger.info(`✅ Mensaje insertado: ${messageResult.messageId} (${message.role})`);
      }

      return {
        conversation: conversationResult,
        messages: messageResults
      };

    } catch (error) {
      logger.error('❌ Error al insertar conversación completa:', error);
      throw error;
    }
  }

  /**
   * EJEMPLO 2: Obtener mensajes para reporte con filtros
   * ===================================================
   */
  async generateMessagesReport(options = {}) {
    try {
      const {
        projectId = null,
        searchQuery = '',
        messageRole = null,  // 'user', 'assistant', 'system'
        dateFrom = null,
        dateTo = null,
        limit = 50
      } = options;

      // Llamar a la función corregida
      const report = await this.db.getMessagesForReport(projectId, {
        searchQuery,
        messageRole,
        dateFrom,
        dateTo,
        limit
      });

      // Los resultados ya vienen correctamente estructurados:
      // - message_content: CONTENIDO real del mensaje
      // - conversation_title: TÍTULO de la conversación
      // - message_role: rol del emisor
      // - message_date: fecha/hora del mensaje

      logger.info(`📊 Reporte generado: ${report.messages.length} mensajes encontrados`);
      
      return report;

    } catch (error) {
      logger.error('❌ Error al generar reporte:', error);
      throw error;
    }
  }

  /**
   * EJEMPLO 3: Buscar mensajes por contenido específico
   * ===================================================
   */
  async searchMessagesByContent(searchTerm, projectId = null) {
    try {
      const report = await this.db.getMessagesForReport(projectId, {
        searchQuery: searchTerm,
        limit: 100
      });

      // Filtrar solo mensajes que contengan el término en el CONTENIDO
      const filteredMessages = report.messages.filter(msg => 
        msg.message_content.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return {
        searchTerm,
        projectId,
        totalFound: filteredMessages.length,
        messages: filteredMessages.map(msg => ({
          // Datos del mensaje
          messageId: msg.message_id,
          role: msg.message_role,
          content: msg.message_content,     // CONTENIDO real
          date: msg.message_date,
          
          // Datos de la conversación
          conversationId: msg.conversation_id,
          conversationTitle: msg.conversation_title,  // TÍTULO de conversación
          
          // Datos del proyecto
          projectName: msg.project_name
        }))
      };

    } catch (error) {
      logger.error('❌ Error en búsqueda por contenido:', error);
      throw error;
    }
  }

  /**
   * EJEMPLO 4: Insertar mensaje individual en conversación existente
   * ================================================================
   */
  async addMessageToExistingConversation(conversationId, role, content, authorName = null) {
    try {
      const result = await this.db.insertMessage(
        conversationId,
        role,        // 'user', 'assistant', 'system'  
        content,     // CONTENIDO real del mensaje
        {
          authorName: authorName,
          createTime: Date.now() / 1000
        }
      );

      logger.info(`✅ Mensaje agregado a conversación ${conversationId}: ${result.messageId}`);
      
      return result;

    } catch (error) {
      logger.error('❌ Error al agregar mensaje:', error);
      throw error;
    }
  }
}

// Ejemplo de uso completo
async function exampleUsage() {
  const service = new ChatBETOService();
  
  try {
    await service.initialize();

    // Ejemplo 1: Crear conversación completa
    const newConversation = await service.insertCompleteConversation(
      1, // projectId
      "Implementación de API REST", // TÍTULO de la conversación
      [
        {
          role: 'user',
          content: '¿Cómo implemento una API REST en Node.js?', // CONTENIDO real
          authorName: 'Usuario'
        },
        {
          role: 'assistant', 
          content: 'Para implementar una API REST en Node.js puedes usar Express...', // CONTENIDO real
          authorName: 'ChatGPT'
        }
      ]
    );

    // Ejemplo 2: Generar reporte
    const report = await service.generateMessagesReport({
      projectId: 1,
      messageRole: 'user',
      searchQuery: 'API',
      limit: 20
    });

    console.log('📊 Reporte generado:');
    console.log(`Total mensajes: ${report.messages.length}`);
    
    report.messages.forEach((msg, index) => {
      console.log(`\n${index + 1}. ${msg.message_role.toUpperCase()}`);
      console.log(`   Conversación: "${msg.conversation_title}"`);     // TÍTULO
      console.log(`   Contenido: "${msg.message_content.substring(0, 100)}..."`); // CONTENIDO
      console.log(`   Fecha: ${msg.message_date}`);
      console.log(`   Proyecto: ${msg.project_name}`);
    });

    // Ejemplo 3: Búsqueda específica
    const searchResults = await service.searchMessagesByContent('Node.js', 1);
    console.log(`\n🔍 Encontrados ${searchResults.totalFound} mensajes con "Node.js"`);

  } catch (error) {
    logger.error('❌ Error en ejemplo de uso:', error);
  }
}

module.exports = { ChatBETOService, exampleUsage };

/**
 * DIFERENCIAS CLAVE IMPLEMENTADAS:
 * ================================
 * 
 * ANTES (PROBLEMA):
 * - insertMessage confundía título con contenido
 * - getMessages devolvía datos mezclados o incorrectos
 * - No había separación clara entre title y content
 * 
 * DESPUÉS (CORREGIDO):
 * - insertMessage(conversationId, role, content) → content es CONTENIDO real
 * - insertConversation(data) → data.title es TÍTULO de conversación
 * - getMessagesForReport() devuelve:
 *   * conversation_title: TÍTULO de la conversación
 *   * message_content: CONTENIDO del mensaje  
 *   * message_role: rol del emisor
 *   * message_date: fecha/hora
 * 
 * MAPEO CORRECTO:
 * - conversations.title ← TÍTULO de la conversación
 * - messages.content_text ← CONTENIDO real de cada mensaje
 * - messages.author_role ← rol del emisor (user/assistant/system)
 * - Relación: conversations (1) → messages (muchos)
 */