// ❌ ERROR HANDLER - GLOBAL ERROR MANAGEMENT
// Maneja todos los errores de la aplicación de forma centralizada

const errorHandler = (err, req, res, next) => {
  console.error('\n🚨 ===== ERROR DETECTED =====');
  console.error(`Time: ${new Date().toISOString()}`);
  console.error(`Request: ${req.method} ${req.originalUrl}`);
  console.error(`IP: ${req.ip}`);
  console.error(`User: ${req.user ? req.user.id : 'anonymous'}`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error('============================\n');

  // Default error object
  let error = {
    error: 'Internal Server Error',
    message: 'Something went wrong on our end',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  };

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    error = {
      error: 'Validation Error',
      message: err.message,
      details: err.details || [],
      statusCode: 400
    };
  } else if (err.name === 'CastError') {
    error = {
      error: 'Invalid Data Format',
      message: 'Invalid ID format or data type',
      statusCode: 400
    };
  } else if (err.code === 11000) {
    error = {
      error: 'Duplicate Entry',
      message: 'Resource already exists',
      statusCode: 409
    };
  } else if (err.name === 'JsonWebTokenError') {
    error = {
      error: 'Authentication Error',
      message: 'Invalid token',
      statusCode: 401
    };
  } else if (err.name === 'TokenExpiredError') {
    error = {
      error: 'Authentication Error',
      message: 'Token has expired',
      statusCode: 401
    };
  } else if (err.statusCode) {
    error = {
      error: err.name || 'Application Error',
      message: err.message,
      statusCode: err.statusCode
    };
  }

  // Set status code
  const statusCode = error.statusCode || 500;

  // Add development-specific details
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
    error.details = err.details || null;
  }

  // Send error response
  res.status(statusCode).json(error);
};

module.exports = errorHandler;
