const winston = require('winston');
const path = require('path');
const config = require('../../config/config');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'chatbeto-listener' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: config.logging.file,
      format: fileFormat,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
    }),
    
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
    })
  ]
});

// Add request logging helper
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

// Add webhook logging helper
logger.logWebhook = (eventType, payload, metadata = {}) => {
  logger.info('Webhook Event', {
    eventType,
    payloadSize: JSON.stringify(payload).length,
    metadata,
    timestamp: new Date().toISOString()
  });
};

// Add database logging helper
logger.logDatabase = (operation, details = {}) => {
  logger.info('Database Operation', {
    operation,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Add sync logging helper
logger.logSync = (action, details = {}) => {
  logger.info('Sync Operation', {
    action,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;