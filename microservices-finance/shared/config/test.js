module.exports = {
  // Test-specific configuration
  logging: {
    level: 'error', // Minimal logging during tests
    format: 'simple'
  },

  database: {
    mongodb: {
      uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/microservices-finance-test'
    }
  },

  redis: {
    db: 1 // Use different Redis database for tests
  },

  rateLimit: {
    max: 100000, // No rate limiting during tests
    windowMs: 1000
  },

  security: {
    bcryptRounds: 4, // Fastest for tests
    helmet: {
      contentSecurityPolicy: false,
      hsts: false
    }
  },

  jwt: {
    expiresIn: '1h', // Shorter expiration for tests
    refreshExpiresIn: '2h'
  },

  monitoring: {
    prometheus: {
      enabled: false // Disable monitoring in tests
    }
  },

  features: {
    devTools: true,
    detailedErrors: true,
    mockServices: true
  },

  queue: {
    defaultJobOptions: {
      removeOnComplete: 1,
      removeOnFail: 1,
      attempts: 1
    },
    concurrency: 1
  }
};
