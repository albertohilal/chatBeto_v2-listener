const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./src/services/logger');
const database = require('./src/services/database');
const openaiService = require('./src/services/openai');
const webhookRoutes = require('./src/routes/webhook');
const openaiRoutes = require('./src/routes/openai');
const { 
  corsMiddleware, 
  validateRequest, 
  errorHandler, 
  securityHeaders 
} = require('./src/middleware/auth');

class ChatBETOListener {
  constructor() {
    this.app = express();
    this.server = null;
  }

  async initialize() {
    try {
      // Initialize database connection
      await database.initialize();

      // Initialize OpenAI service (optional)
      await openaiService.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      logger.info('✅ ChatBETO Listener initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize ChatBETO Listener:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Custom security headers
    this.app.use(securityHeaders);

    // CORS
    this.app.use(corsMiddleware);

    // Request logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request validation
    this.app.use(validateRequest);

    // Trust proxy (for rate limiting and IP detection)
    this.app.set('trust proxy', 1);
  }

  setupRoutes() {
    // API routes
    this.app.use('/api/v1', webhookRoutes);
    this.app.use('/api/v1/openai', openaiRoutes);
    
    // Legacy routes (for backward compatibility)
    this.app.use('/', webhookRoutes);

    // 404 handler
    this.app.use((req, res) => {
      logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    
    // Unhandled errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('unhandledRejection', 1);
    });
  }

  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(config.server.port, () => {
        logger.info(`🚀 ChatBETO Listener started successfully`);
        logger.info(`📡 Server running on port ${config.server.port}`);
        logger.info(`🌍 Environment: ${config.server.nodeEnv}`);
        logger.info(`🔗 Base URL: ${config.server.apiBaseUrl}`);
        logger.info(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      });

      // Setup periodic health checks
      this.setupHealthMonitoring();

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  setupHealthMonitoring() {
    // Periodic database health check
    setInterval(async () => {
      try {
        const health = await database.healthCheck();
        if (health.status !== 'healthy') {
          logger.error('❌ Database health check failed:', health);
        }
      } catch (error) {
        logger.error('❌ Health monitoring error:', error);
      }
    }, config.healthCheck.interval);

    // Memory usage monitoring
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Log warning if memory usage is high
      if (memUsageMB.heapUsed > 500) {
        logger.warn('High memory usage detected:', memUsageMB);
      }
    }, 60000); // Check every minute
  }

  async shutdown(signal, exitCode = 0) {
    logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

    // Close HTTP server
    if (this.server) {
      this.server.close(() => {
        logger.info('✅ HTTP server closed');
      });
    }

    // Close database connections
    try {
      await database.close();
      logger.info('✅ Database connections closed');
    } catch (error) {
      logger.error('❌ Error closing database connections:', error);
    }

    logger.info('👋 Graceful shutdown completed');
    process.exit(exitCode);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  const listener = new ChatBETOListener();
  listener.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = ChatBETOListener;