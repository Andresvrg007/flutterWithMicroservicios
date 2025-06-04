// 🔐 AUTH MIDDLEWARE - JWT TOKEN VALIDATION
// Protege las rutas que requieren autenticación

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No authorization header provided',
        code: 'NO_TOKEN'
      });
    }

    // Check if it starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid authorization format. Use: Bearer <token>',
        code: 'INVALID_FORMAT'
      });
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
        code: 'EMPTY_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request object
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Log successful authentication (optional)
    if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
      console.log(`🔐 AUTH SUCCESS: User ${req.user.id} accessed ${req.method} ${req.originalUrl}`);
    }

    next();
  } catch (error) {
    // Handle different JWT errors
    let errorMessage = 'Invalid token';
    let errorCode = 'INVALID_TOKEN';

    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Malformed token';
      errorCode = 'MALFORMED_TOKEN';
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token not active yet';
      errorCode = 'TOKEN_NOT_ACTIVE';
    }

    console.log(`🚫 AUTH FAILED: ${errorMessage} for ${req.method} ${req.originalUrl}`);

    return res.status(401).json({
      error: 'Authentication failed',
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = authMiddleware;
