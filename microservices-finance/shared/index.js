// Shared middleware exports
module.exports = {
  auth: require('./middleware/auth'),
  logging: require('./middleware/logging'),
  errorHandler: require('./middleware/errorHandler'),
  validation: require('./middleware/validation'),
  rateLimit: require('./middleware/rateLimit'),
  
  // Utilities
  utils: require('./utils'),
  
  // Configuration
  config: require('./config'),
  
  // Constants
  constants: require('./constants')
};
