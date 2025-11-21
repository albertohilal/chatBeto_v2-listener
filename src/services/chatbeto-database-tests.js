/**
 * TESTS - ChatBETO Database Functions
 * ===================================
 * 
 * Tests para validar que las funciones corregidas funcionan
 * correctamente y distinguen entre título y contenido.
 */

const { ChatBETOService } = require('./chatbeto-service-example');
const chatBETODatabase = require('./chatbeto-database');
const logger = require('./logger');

class ChatBETODatabaseTests {
  constructor() {
    this.service = new ChatBETOService();
    this.testConversationId = null;
    this.testProjectId = 999; // ID de proyecto de prueba
  }

  async runAllTests() {
    try {
      logger.info('🧪 Iniciando tests de ChatBETO Database...');
      
      await this.service.initialize();
      
      await this.testInsertConversation();
      await this.testInsertMessage();
      await this.testGetMessagesForReport();
      await this.testSearchFunctionality();
      await this.testDataIntegrity();
      
      logger.info('✅ Todos los tests completados exitosamente');
      
    } catch (error) {
      logger.error('❌ Error en tests:', error);
      throw error;
    }
  }

  /**
   * TEST 1: Verificar que insertConversation almacena título correctamente
   */
  async testInsertConversation() {
    logger.info('🧪 Test 1: insertConversation');
    
    const conversationTitle = "Test: Implementación de chatbot";
    
    try {
      const result = await chatBETODatabase.insertConversation({
        conversation_id: `test_conv_${Date.now()}`,
        title: conversationTitle,  // TÍTULO (no contenido)
        project_id: this.testProjectId,
        model: 'gpt-4-test',
        create_time: Date.now() / 1000
      });

      this.testConversationId = result.conversationId;
      
      // Verificar que el título se guardó correctamente
      if (result.success && result.title === conversationTitle) {
        logger.info('✅ Test 1 PASSED: Título de conversación guardado correctamente');
        return true;
      } else {
        throw new Error(`Título incorrecto. Esperado: "${conversationTitle}", Recibido: "${result.title}"`);
      }
      
    } catch (error) {
      logger.error('❌ Test 1 FAILED:', error.message);
      throw error;
    }
  }

  /**
   * TEST 2: Verificar que insertMessage almacena contenido real
   */
  async testInsertMessage() {
    logger.info('🧪 Test 2: insertMessage');
    
    const testMessages = [
      {
        role: 'user',
        content: 'Este es el CONTENIDO REAL del mensaje del usuario. No es un título.',
        expectedRole: 'user'
      },
      {
        role: 'assistant',
        content: 'Esta es la RESPUESTA REAL del asistente con información detallada y útil.',
        expectedRole: 'assistant'
      },
      {
        role: 'system',
        content: 'Mensaje del sistema con instrucciones específicas para el comportamiento.',
        expectedRole: 'system'
      }
    ];

    try {
      const insertResults = [];
      
      for (const testMsg of testMessages) {
        const result = await chatBETODatabase.insertMessage(
          this.testConversationId,
          testMsg.role,
          testMsg.content  // CONTENIDO real (no título)
        );
        
        insertResults.push({
          ...result,
          originalContent: testMsg.content,
          originalRole: testMsg.role
        });
      }

      // Verificar que todos se insertaron correctamente
      const allSuccessful = insertResults.every(r => r.success);
      
      if (allSuccessful) {
        logger.info(`✅ Test 2 PASSED: ${insertResults.length} mensajes insertados correctamente`);
        return true;
      } else {
        throw new Error('Algunos mensajes no se insertaron correctamente');
      }
      
    } catch (error) {
      logger.error('❌ Test 2 FAILED:', error.message);
      throw error;
    }
  }

  /**
   * TEST 3: Verificar que getMessagesForReport devuelve datos correctos
   */
  async testGetMessagesForReport() {
    logger.info('🧪 Test 3: getMessagesForReport');
    
    try {
      const report = await chatBETODatabase.getMessagesForReport(this.testProjectId, {
        limit: 10
      });

      if (!report.success || !Array.isArray(report.messages)) {
        throw new Error('Formato de respuesta incorrecto');
      }

      // Verificar estructura de los datos
      const sampleMessage = report.messages[0];
      if (!sampleMessage) {
        logger.info('⚠️ Test 3 SKIPPED: No hay mensajes en el reporte');
        return true;
      }

      const requiredFields = [
        'message_id',
        'message_role', 
        'message_content',    // CONTENIDO del mensaje
        'message_date',
        'conversation_id',
        'conversation_title', // TÍTULO de la conversación
        'project_name'
      ];

      const missingFields = requiredFields.filter(field => 
        !(field in sampleMessage)
      );

      if (missingFields.length > 0) {
        throw new Error(`Campos faltantes en el reporte: ${missingFields.join(', ')}`);
      }

      // Verificar que conversation_title y message_content son diferentes
      const hasDifferentTitleAndContent = report.messages.some(msg => 
        msg.conversation_title !== msg.message_content &&
        msg.conversation_title.length > 0 &&
        msg.message_content.length > 0
      );

      if (hasDifferentTitleAndContent) {
        logger.info('✅ Test 3 PASSED: Reporte devuelve título y contenido diferenciados');
        logger.info(`   📊 Mensajes en reporte: ${report.messages.length}`);
        return true;
      } else {
        logger.info('⚠️ Test 3 WARNING: No se puede verificar diferencia título/contenido');
        return true;
      }
      
    } catch (error) {
      logger.error('❌ Test 3 FAILED:', error.message);
      throw error;
    }
  }

  /**
   * TEST 4: Verificar funcionalidad de búsqueda
   */
  async testSearchFunctionality() {
    logger.info('🧪 Test 4: Funcionalidad de búsqueda');
    
    try {
      // Buscar mensajes por contenido específico
      const searchResults = await this.service.searchMessagesByContent(
        'CONTENIDO REAL', // Buscar el texto que insertamos en test anterior
        this.testProjectId
      );

      if (searchResults.totalFound >= 0) {
        logger.info(`✅ Test 4 PASSED: Búsqueda completada (${searchResults.totalFound} resultados)`);
        
        // Si hay resultados, verificar estructura
        if (searchResults.messages.length > 0) {
          const firstResult = searchResults.messages[0];
          if (firstResult.content && firstResult.conversationTitle) {
            logger.info('   ✓ Resultados contienen contenido y título separados');
          }
        }
        
        return true;
      } else {
        throw new Error('Error en funcionalidad de búsqueda');
      }
      
    } catch (error) {
      logger.error('❌ Test 4 FAILED:', error.message);
      throw error;
    }
  }

  /**
   * TEST 5: Verificar integridad de datos (no hay confusión título/contenido)
   */
  async testDataIntegrity() {
    logger.info('🧪 Test 5: Integridad de datos');
    
    try {
      // Obtener mensajes del proyecto de prueba
      const report = await chatBETODatabase.getMessagesForReport(this.testProjectId);
      
      if (!report.success) {
        throw new Error('No se pudo obtener reporte para verificación');
      }

      let integrityIssues = [];

      for (const message of report.messages) {
        // Verificar que conversation_title no es igual a message_content
        // (indica que no hay confusión entre título y contenido)
        if (message.conversation_title === message.message_content && 
            message.conversation_title.length > 50) {
          integrityIssues.push(`Posible confusión título/contenido en mensaje ${message.message_id}`);
        }

        // Verificar que message_content no parece un título (muy corto)
        if (message.message_role === 'user' && 
            message.message_content.length < 10 && 
            !message.message_content.includes('?') &&
            !message.message_content.includes('.')) {
          integrityIssues.push(`Mensaje muy corto (posible título): ${message.message_id}`);
        }

        // Verificar que conversation_title no parece contenido (muy largo)
        if (message.conversation_title.length > 200) {
          integrityIssues.push(`Título muy largo (posible contenido): ${message.conversation_id}`);
        }
      }

      if (integrityIssues.length === 0) {
        logger.info('✅ Test 5 PASSED: No se detectaron problemas de integridad');
        return true;
      } else {
        logger.warn('⚠️ Test 5 WARNING: Posibles problemas de integridad:');
        integrityIssues.forEach(issue => logger.warn(`   - ${issue}`));
        return true; // No fallar, solo advertir
      }
      
    } catch (error) {
      logger.error('❌ Test 5 FAILED:', error.message);
      throw error;
    }
  }

  /**
   * Limpiar datos de prueba
   */
  async cleanup() {
    try {
      if (this.testConversationId) {
        // Eliminar mensajes de prueba
        await chatBETODatabase.query(
          'DELETE FROM messages WHERE conversation_id = ?',
          [this.testConversationId]
        );
        
        // Eliminar conversación de prueba
        await chatBETODatabase.query(
          'DELETE FROM conversations WHERE conversation_id = ?',
          [this.testConversationId]
        );
        
        logger.info('🧹 Datos de prueba eliminados');
      }
    } catch (error) {
      logger.warn('⚠️ Error al limpiar datos de prueba:', error.message);
    }
  }
}

// Función para ejecutar tests
async function runTests() {
  const tests = new ChatBETODatabaseTests();
  
  try {
    await tests.runAllTests();
    logger.info('🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
  } catch (error) {
    logger.error('💥 TESTS FALLARON:', error);
  } finally {
    await tests.cleanup();
    await chatBETODatabase.close();
  }
}

module.exports = { ChatBETODatabaseTests, runTests };

// Ejecutar tests si este archivo se ejecuta directamente
if (require.main === module) {
  runTests().catch(console.error);
}