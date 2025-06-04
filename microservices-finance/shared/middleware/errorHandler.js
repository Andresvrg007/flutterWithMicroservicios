const { logger } = require('./logging');

/**
 * Global error handler middleware
 */
const errorHandler = (options = {}) => {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    logErrors = true
  } = options;

  return (err, req, res, next) => {
    // Log error if logging is enabled
    if (logErrors) {
      logger.error('Application error', {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }

    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation error';
      code = 'VALIDATION_ERROR';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid data format';
      code = 'INVALID_FORMAT';
    } else if (err.name === 'MongoError' && err.code === 11000) {
      statusCode = 409;
      message = 'Duplicate key error';
      code = 'DUPLICATE_KEY';
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = 'Unauthorized';
      code = 'UNAUTHORIZED';
    } else if (err.name === 'ForbiddenError') {
      statusCode = 403;
      message = 'Forbidden';
      code = 'FORBIDDEN';
    } else if (err.name === 'NotFoundError') {
      statusCode = 404;
      message = 'Resource not found';
      code = 'NOT_FOUND';
    } else if (err.statusCode) {
      statusCode = err.statusCode;
      message = err.message;
      code = err.code || 'CUSTOM_ERROR';
    }

    // Prepare error response
    const errorResponse = {
      error: message,
      code,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    };

    // Include stack trace in development
    if (includeStack) {
      errorResponse.stack = err.stack;
    }

    // Include validation details if available
    if (err.details) {
      errorResponse.details = err.details;
    }

    res.status(statusCode).json(errorResponse);
  };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes
 */
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
};
