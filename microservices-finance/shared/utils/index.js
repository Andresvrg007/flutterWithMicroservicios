const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * Utility functions for the microservices
 */
class Utils {
  /**
   * Generate a random string of specified length
   */
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey() {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateRandomString(16);
    return `mf_${timestamp}_${randomPart}`;
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload, options = {}) {
    const secret = process.env.JWT_SECRET;
    const defaultOptions = {
      expiresIn: '24h',
      issuer: 'microservices-finance',
      audience: 'finance-app'
    };
    
    return jwt.sign(payload, secret, { ...defaultOptions, ...options });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken() {
    return this.generateRandomString(64);
  }

  /**
   * Sanitize object by removing sensitive fields
   */
  static sanitizeObject(obj, sensitiveFields = ['password', 'token', 'secret', 'key']) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Calculate percentage change
   */
  static calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Generate pagination metadata
   */
  static generatePagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Generate correlation ID for request tracing
   */
  static generateCorrelationId() {
    return `${Date.now()}-${this.generateRandomString(8)}`;
  }

  /**
   * Delay execution for specified milliseconds
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry(fn, options = {}) {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2
    } = options;

    let attempt = 1;
    let delay = baseDelay;

    while (attempt <= maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
        
        delay = Math.min(delay * backoffFactor, maxDelay);
        attempt++;
      }
    }
  }

  /**
   * Deep merge objects
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Convert object to query string
   */
  static objectToQueryString(obj) {
    return Object.keys(obj)
      .filter(key => obj[key] !== undefined && obj[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
      .join('&');
  }

  /**
   * Parse query string to object
   */
  static queryStringToObject(queryString) {
    const params = new URLSearchParams(queryString);
    const obj = {};
    
    for (const [key, value] of params) {
      obj[key] = value;
    }
    
    return obj;
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * Generate unique filename with timestamp
   */
  static generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = this.generateRandomString(8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Validate file type
   */
  static isValidFileType(filename, allowedTypes = []) {
    if (allowedTypes.length === 0) return true;
    
    const extension = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate color from string (for avatars, charts, etc.)
   */
  static stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Truncate text to specified length
   */
  static truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Calculate compound interest
   */
  static calculateCompoundInterest(principal, rate, time, compoundFrequency = 1) {
    return principal * Math.pow(1 + (rate / compoundFrequency), compoundFrequency * time);
  }

  /**
   * Calculate simple interest
   */
  static calculateSimpleInterest(principal, rate, time) {
    return principal * (1 + (rate * time));
  }

  /**
   * Calculate monthly payment for a loan
   */
  static calculateLoanPayment(principal, monthlyRate, numberOfPayments) {
    if (monthlyRate === 0) return principal / numberOfPayments;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  }
}

module.exports = Utils;
