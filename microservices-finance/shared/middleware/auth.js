const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and extracts user information
 */
const authenticateToken = (options = {}) => {
  const {
    secret = process.env.JWT_SECRET,
    optional = false,
    skipPaths = []
  } = options;

  return (req, res, next) => {
    // Skip authentication for certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      if (optional) {
        return next();
      }
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        let errorCode = 'TOKEN_INVALID';
        let message = 'Invalid token';

        if (err.name === 'TokenExpiredError') {
          errorCode = 'TOKEN_EXPIRED';
          message = 'Token has expired';
        } else if (err.name === 'JsonWebTokenError') {
          errorCode = 'TOKEN_MALFORMED';
          message = 'Malformed token';
        }

        return res.status(403).json({ 
          error: message,
          code: errorCode
        });
      }

      req.user = user;
      next();
    });
  };
};

/**
 * Role-based authorization middleware
 */
const requireRole = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (requiredRoles.length > 0 && !hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRoles,
        current: userRoles
      });
    }

    next();
  };
};

/**
 * API Key authentication middleware
 */
const authenticateApiKey = (validKeys = []) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        code: 'API_KEY_MISSING'
      });
    }

    if (!validKeys.includes(apiKey)) {
      return res.status(403).json({ 
        error: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  authenticateApiKey
};
