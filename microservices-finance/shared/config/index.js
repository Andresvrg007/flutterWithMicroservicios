const path = require('path');
const fs = require('fs');

/**
 * Configuration management for microservices
 */
class Config {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from environment variables and files
   */
  loadConfig() {
    const baseConfig = {
      // Environment
      env: this.env,
      port: parseInt(process.env.PORT) || 3000,
      host: process.env.HOST || 'localhost',

      // Service Discovery
      services: {
        apiGateway: {
          host: process.env.API_GATEWAY_HOST || 'localhost',
          port: parseInt(process.env.API_GATEWAY_PORT) || 3001,
          url: process.env.API_GATEWAY_URL || 'http://localhost:3001'
        },
        notificationService: {
          host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.NOTIFICATION_SERVICE_PORT) || 3004,
          url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004'
        },
        processingService: {
          host: process.env.PROCESSING_SERVICE_HOST || 'localhost',
          port: parseInt(process.env.PROCESSING_SERVICE_PORT) || 3002,
          url: process.env.PROCESSING_SERVICE_URL || 'http://localhost:3002'
        }
      },

      // Database Configuration
      database: {
        mongodb: {
          uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/microservices-finance',
          options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
            serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT) || 5000,
            socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
          }
        }
      },

      // Redis Configuration
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      },

      // JWT Configuration
      jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'microservices-finance',
        audience: process.env.JWT_AUDIENCE || 'finance-app'
      },

      // CORS Configuration
      cors: {
        origin: this.parseCorsOrigins(process.env.CORS_ORIGINS),
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: (process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
        allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-API-Key').split(',')
      },

      // Rate Limiting
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
        message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests from this IP'
      },

      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        file: {
          enabled: process.env.LOG_FILE_ENABLED === 'true',
          filename: process.env.LOG_FILE_NAME || 'app.log',
          maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
          maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES) || 5
        }
      },

      // Security Configuration
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        apiKeyLength: parseInt(process.env.API_KEY_LENGTH) || 32,
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
        helmet: {
          contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
          hsts: process.env.HSTS_ENABLED !== 'false'
        }
      },

      // File Upload Configuration
      upload: {
        maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'jpg,jpeg,png,pdf,csv,xlsx').split(','),
        destination: process.env.UPLOAD_DESTINATION || './uploads',
        publicPath: process.env.UPLOAD_PUBLIC_PATH || '/uploads'
      },

      // Email Configuration
      email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        from: process.env.EMAIL_FROM || 'noreply@microservices-finance.com'
      },

      // SMS Configuration (Twilio)
      sms: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_PHONE_NUMBER
      },

      // Push Notifications
      pushNotifications: {
        firebase: {
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          clientId: process.env.FIREBASE_CLIENT_ID,
          authUri: process.env.FIREBASE_AUTH_URI,
          tokenUri: process.env.FIREBASE_TOKEN_URI
        },
        webPush: {
          publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
          privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
          email: process.env.WEB_PUSH_EMAIL
        }
      },

      // AWS Configuration
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3: {
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_S3_REGION || 'us-east-1'
        },
        ses: {
          region: process.env.AWS_SES_REGION || 'us-east-1'
        }
      },

      // Monitoring Configuration
      monitoring: {
        prometheus: {
          enabled: process.env.PROMETHEUS_ENABLED === 'true',
          port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
          path: process.env.PROMETHEUS_PATH || '/metrics'
        },
        healthcheck: {
          path: process.env.HEALTHCHECK_PATH || '/health',
          timeout: parseInt(process.env.HEALTHCHECK_TIMEOUT) || 5000
        }
      },

      // Bull Queue Configuration
      queue: {
        defaultJobOptions: {
          removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE) || 100,
          removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL) || 50,
          attempts: parseInt(process.env.QUEUE_ATTEMPTS) || 3,
          backoff: {
            type: 'exponential',
            delay: parseInt(process.env.QUEUE_BACKOFF_DELAY) || 2000
          }
        },
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5
      }
    };

    // Load environment-specific configuration
    const envConfig = this.loadEnvironmentConfig();
    
    return this.mergeConfigs(baseConfig, envConfig);
  }

  /**
   * Load environment-specific configuration
   */
  loadEnvironmentConfig() {
    const configPath = path.join(__dirname, `${this.env}.js`);
    
    if (fs.existsSync(configPath)) {
      try {
        return require(configPath);
      } catch (error) {
        console.warn(`Failed to load environment config: ${error.message}`);
      }
    }
    
    return {};
  }

  /**
   * Parse CORS origins from environment variable
   */
  parseCorsOrigins(originsString) {
    if (!originsString) {
      return this.env === 'development' ? true : [];
    }
    
    if (originsString === '*') {
      return true;
    }
    
    return originsString.split(',').map(origin => origin.trim());
  }

  /**
   * Deep merge configuration objects
   */
  mergeConfigs(base, override) {
    const result = { ...base };
    
    for (const key in override) {
      if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }
    
    return result;
  }

  /**
   * Get configuration value by path
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set configuration value by path
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Validate required configuration
   */
  validate() {
    const required = [
      'jwt.secret',
      'database.mongodb.uri'
    ];
    
    const missing = [];
    
    for (const path of required) {
      if (this.get(path) === undefined) {
        missing.push(path);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Get database configuration for specific service
   */
  getDatabaseConfig(serviceName = 'default') {
    const baseConfig = this.get('database.mongodb');
    
    // Service-specific database configuration
    const serviceConfig = this.get(`database.${serviceName}`);
    
    return serviceConfig ? { ...baseConfig, ...serviceConfig } : baseConfig;
  }

  /**
   * Get service URL
   */
  getServiceUrl(serviceName) {
    return this.get(`services.${serviceName}.url`);
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false);
  }
}

// Create and export singleton instance
const config = new Config();

module.exports = config;
