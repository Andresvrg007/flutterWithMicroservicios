const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * Request validation middleware using Joi
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new ValidationError('Validation failed', details));
    }

    // Replace the request property with the validated value
    req[property] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
  }),

  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),

  // User registration
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
  }),

  // User login
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Transaction
  transaction: Joi.object({
    amount: Joi.number().precision(2).required(),
    description: Joi.string().min(1).max(255).required(),
    category: Joi.string().required(),
    type: Joi.string().valid('income', 'expense').required(),
    date: Joi.date().iso().default(() => new Date()),
    tags: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().max(1000).optional()
  }),

  // Budget
  budget: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    amount: Joi.number().positive().precision(2).required(),
    category: Joi.string().required(),
    period: Joi.string().valid('weekly', 'monthly', 'quarterly', 'yearly').required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    alertThreshold: Joi.number().min(0).max(100).default(80)
  }),

  // Notification
  notification: Joi.object({
    type: Joi.string().valid(
      'transaction_alert',
      'budget_alert', 
      'investment_update',
      'security_alert',
      'market_news',
      'payment_reminder',
      'goal_milestone',
      'system_notification'
    ).required(),
    title: Joi.string().min(1).max(100).required(),
    message: Joi.string().min(1).max(500).required(),
    channels: Joi.array().items(
      Joi.string().valid('push', 'email', 'sms', 'websocket')
    ).min(1).required(),
    recipients: Joi.array().items(Joi.string()).optional(),
    data: Joi.object().optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    scheduled: Joi.date().iso().min('now').optional()
  }),

  // Device token registration
  deviceToken: Joi.object({
    token: Joi.string().required(),
    platform: Joi.string().valid('ios', 'android', 'web').required(),
    deviceId: Joi.string().required(),
    appVersion: Joi.string().optional()
  })
};

/**
 * Specific validation middleware functions
 */
const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  schemas
};
