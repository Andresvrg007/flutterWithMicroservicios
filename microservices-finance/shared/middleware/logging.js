const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'microservice' 
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Request logging middleware
 */
const requestLogger = (options = {}) => {
  const {
    includeBody = false,
    excludePaths = ['/health', '/metrics'],
    maxBodyLength = 1000
  } = options;

  return (req, res, next) => {
    // Skip logging for excluded paths
    if (excludePaths.includes(req.path)) {
      return next();
    }

    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    req.requestId = requestId;

    // Log request
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };

    if (includeBody && req.body) {
      const bodyStr = JSON.stringify(req.body);
      logData.body = bodyStr.length > maxBodyLength ? 
        bodyStr.substring(0, maxBodyLength) + '...' : 
        bodyStr;
    }

    if (req.user) {
      logData.userId = req.user.id;
    }

    logger.info('Incoming request', logData);

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  next(err);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
};
