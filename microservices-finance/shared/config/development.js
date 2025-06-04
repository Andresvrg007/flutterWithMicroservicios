module.exports = {
  // Development-specific configuration
  logging: {
    level: 'debug',
    format: 'dev'
  },

  cors: {
    origin: true, // Allow all origins in development
    credentials: true
  },

  rateLimit: {
    max: 10000, // Higher limit for development
    windowMs: 1 * 60 * 1000 // 1 minute
  },

  security: {
    bcryptRounds: 8, // Faster for development
    helmet: {
      contentSecurityPolicy: false, // Disable CSP in development
      hsts: false
    }
  },

  monitoring: {
    prometheus: {
      enabled: true
    }
  },

  features: {
    devTools: true,
    detailedErrors: true,
    mockServices: false
  }
};
