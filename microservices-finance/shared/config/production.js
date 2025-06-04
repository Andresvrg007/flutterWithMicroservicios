module.exports = {
  // Production-specific configuration
  logging: {
    level: 'warn',
    format: 'combined',
    file: {
      enabled: true
    }
  },

  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true
  },

  rateLimit: {
    max: 1000,
    windowMs: 15 * 60 * 1000 // 15 minutes
  },

  security: {
    bcryptRounds: 12,
    helmet: {
      contentSecurityPolicy: true,
      hsts: true
    }
  },

  monitoring: {
    prometheus: {
      enabled: true
    }
  },

  features: {
    devTools: false,
    detailedErrors: false,
    mockServices: false
  },

  // Production database optimizations
  database: {
    mongodb: {
      options: {
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    }
  },

  // Production queue settings
  queue: {
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 20,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    },
    concurrency: 10
  }
};
