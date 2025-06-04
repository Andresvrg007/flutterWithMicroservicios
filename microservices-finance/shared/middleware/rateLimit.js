const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

/**
 * Rate limiting middleware with Redis store for distributed limiting
 */
class RateLimitManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.store = new RedisStore({
      client: this.redis,
      prefix: 'rl:'
    });
  }

  /**
   * General API rate limiter
   */
  apiLimiter() {
    return rateLimit({
      store: this.store,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/metrics';
      },
      keyGenerator: (req) => {
        // Use API key if available, otherwise IP
        return req.headers['x-api-key'] || req.ip;
      }
    });
  }

  /**
   * Strict rate limiter for authentication endpoints
   */
  authLimiter() {
    return rateLimit({
      store: this.store,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      keyGenerator: (req) => `auth:${req.ip}:${req.body.email || req.body.username || 'unknown'}`
    });
  }

  /**
   * Rate limiter for password reset requests
   */
  passwordResetLimiter() {
    return rateLimit({
      store: this.store,
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // limit each IP to 3 password reset attempts per hour
      message: {
        error: 'Too many password reset attempts, please try again later.',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `pwd-reset:${req.ip}:${req.body.email || 'unknown'}`
    });
  }

  /**
   * Rate limiter for notification endpoints
   */
  notificationLimiter() {
    return rateLimit({
      store: this.store,
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // limit each user to 100 notifications per minute
      message: {
        error: 'Too many notification requests, please slow down.',
        retryAfter: '1 minute'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `notif:${req.user?.id || req.ip}`
    });
  }

  /**
   * Rate limiter for file upload endpoints
   */
  uploadLimiter() {
    return rateLimit({
      store: this.store,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each user to 10 uploads per 15 minutes
      message: {
        error: 'Too many upload attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `upload:${req.user?.id || req.ip}`
    });
  }

  /**
   * Rate limiter for processing service endpoints
   */
  processingLimiter() {
    return rateLimit({
      store: this.store,
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50, // limit each user to 50 processing requests per 5 minutes
      message: {
        error: 'Too many processing requests, please wait before trying again.',
        retryAfter: '5 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `proc:${req.user?.id || req.ip}`
    });
  }

  /**
   * Dynamic rate limiter based on user tier
   */
  dynamicLimiter(tierLimits = {}) {
    return rateLimit({
      store: this.store,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req) => {
        const userTier = req.user?.tier || 'free';
        return tierLimits[userTier] || tierLimits.free || 100;
      },
      message: (req) => ({
        error: 'Rate limit exceeded for your account tier.',
        tier: req.user?.tier || 'free',
        upgradeMessage: 'Consider upgrading your account for higher limits.'
      }),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `dynamic:${req.user?.id || req.ip}`
    });
  }

  /**
   * Create custom rate limiter with specific options
   */
  customLimiter(options = {}) {
    const defaultOptions = {
      store: this.store,
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false
    };

    return rateLimit({ ...defaultOptions, ...options });
  }

  /**
   * Get current rate limit status for debugging
   */
  async getRateLimitStatus(key) {
    try {
      const data = await this.redis.get(`rl:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key) {
    try {
      await this.redis.del(`rl:${key}`);
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Export singleton instance
const rateLimitManager = new RateLimitManager();

module.exports = {
  RateLimitManager,
  rateLimitManager,
  apiLimiter: rateLimitManager.apiLimiter(),
  authLimiter: rateLimitManager.authLimiter(),
  passwordResetLimiter: rateLimitManager.passwordResetLimiter(),
  notificationLimiter: rateLimitManager.notificationLimiter(),
  uploadLimiter: rateLimitManager.uploadLimiter(),
  processingLimiter: rateLimitManager.processingLimiter()
};
