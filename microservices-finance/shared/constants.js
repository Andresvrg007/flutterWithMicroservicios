/**
 * Shared constants across all microservices
 */

// Service Names
const SERVICES = {
  API_GATEWAY: 'api-gateway',
  PROCESSING_SERVICE: 'processing-service',
  NOTIFICATION_SERVICE: 'notification-service',
  LEGACY_BACKEND: 'legacy-backend'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Error Types
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE_ERROR: 'SERVICE_UNAVAILABLE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  PREMIUM: 'premium',
  MODERATOR: 'moderator'
};

// User Tiers
const USER_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

// Transaction Types
const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
};

// Transaction Status
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Category Types
const CATEGORY_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer'
};

// Notification Types
const NOTIFICATION_TYPES = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'in_app',
  WEBSOCKET: 'websocket'
};

// Notification Priorities
const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Processing Job Types
const JOB_TYPES = {
  PDF_GENERATION: 'pdf_generation',
  EXCEL_EXPORT: 'excel_export',
  PORTFOLIO_ANALYSIS: 'portfolio_analysis',
  BULK_CALCULATION: 'bulk_calculation',
  EMAIL_REPORT: 'email_report',
  BACKUP: 'backup',
  DATA_MIGRATION: 'data_migration'
};

// Job Status
const JOB_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed',
  STUCK: 'stuck'
};

// Queue Names
const QUEUE_NAMES = {
  PROCESSING: 'finance-processing',
  NOTIFICATIONS: 'finance-notifications',
  REPORTS: 'finance-reports',
  EMAILS: 'finance-emails'
};

// Cache Keys
const CACHE_KEYS = {
  USER_SESSIONS: 'user:sessions:',
  API_RATE_LIMIT: 'api:rate_limit:',
  USER_PREFERENCES: 'user:preferences:',
  PORTFOLIO_DATA: 'portfolio:',
  EXCHANGE_RATES: 'exchange_rates',
  MARKET_DATA: 'market_data:'
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  SHORT: 300,        // 5 minutes
  MEDIUM: 1800,      // 30 minutes
  LONG: 3600,        // 1 hour
  VERY_LONG: 86400,  // 24 hours
  SESSION: 604800    // 7 days
};

// API Versions
const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2'
};

// File Types
const FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'txt'],
  SPREADSHEETS: ['csv', 'xlsx', 'xls'],
  ARCHIVES: ['zip', 'rar', '7z']
};

// Currencies
const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  JPY: 'JPY',
  CAD: 'CAD',
  AUD: 'AUD',
  CHF: 'CHF',
  CNY: 'CNY',
  MXN: 'MXN',
  BRL: 'BRL'
};

// Date Formats
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm'
};

// Regex Patterns
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  MONGODB_ID: /^[0-9a-fA-F]{24}$/,
  CREDIT_CARD: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/
};

// Rate Limits
const RATE_LIMITS = {
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5
  },
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3
  },
  NOTIFICATIONS: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100
  },
  UPLOADS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10
  }
};

// Tier Limits
const TIER_LIMITS = {
  [USER_TIERS.FREE]: {
    transactions_per_month: 100,
    api_requests_per_hour: 50,
    storage_mb: 10,
    reports_per_month: 2
  },
  [USER_TIERS.BASIC]: {
    transactions_per_month: 1000,
    api_requests_per_hour: 200,
    storage_mb: 100,
    reports_per_month: 10
  },
  [USER_TIERS.PREMIUM]: {
    transactions_per_month: -1, // unlimited
    api_requests_per_hour: 1000,
    storage_mb: 1000,
    reports_per_month: -1 // unlimited
  },
  [USER_TIERS.ENTERPRISE]: {
    transactions_per_month: -1, // unlimited
    api_requests_per_hour: 5000,
    storage_mb: 10000,
    reports_per_month: -1 // unlimited
  }
};

// Health Check Status
const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded'
};

// Metrics
const METRICS = {
  REQUEST_DURATION: 'http_request_duration_seconds',
  REQUEST_COUNT: 'http_requests_total',
  ACTIVE_CONNECTIONS: 'active_connections',
  QUEUE_SIZE: 'queue_size',
  JOB_PROCESSING_TIME: 'job_processing_duration_seconds',
  ERROR_RATE: 'error_rate',
  MEMORY_USAGE: 'memory_usage_bytes',
  CPU_USAGE: 'cpu_usage_percent'
};

// WebSocket Events
const WEBSOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  NOTIFICATION: 'notification',
  TRANSACTION_UPDATE: 'transaction_update',
  PORTFOLIO_UPDATE: 'portfolio_update',
  SYSTEM_MESSAGE: 'system_message',
  ERROR: 'error'
};

// Environment Types
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Default Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Security
const SECURITY = {
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  API_KEY_LENGTH: 32,
  SESSION_TIMEOUT: 30 * 60 * 1000 // 30 minutes
};

module.exports = {
  SERVICES,
  HTTP_STATUS,
  ERROR_TYPES,
  USER_ROLES,
  USER_TIERS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  CATEGORY_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  JOB_TYPES,
  JOB_STATUS,
  QUEUE_NAMES,
  CACHE_KEYS,
  CACHE_TTL,
  API_VERSIONS,
  FILE_TYPES,
  CURRENCIES,
  DATE_FORMATS,
  REGEX_PATTERNS,
  RATE_LIMITS,
  TIER_LIMITS,
  HEALTH_STATUS,
  METRICS,
  WEBSOCKET_EVENTS,
  ENVIRONMENTS,
  PAGINATION,
  SECURITY
};
