const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'transaction_alert',
      'budget_alert',
      'investment_update',
      'security_alert',
      'market_news',
      'payment_reminder',
      'goal_milestone',
      'system_notification',
      'welcome',
      'password_reset',
      'two_factor_auth'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  templates: {
    push: {
      title: String,
      body: String,
      icon: String,
      badge: String,
      sound: String,
      clickAction: String,
      category: String
    },
    email: {
      subject: String,
      htmlBody: String,
      textBody: String,
      from: String,
      replyTo: String
    },
    sms: {
      body: String,
      from: String
    },
    websocket: {
      title: String,
      body: String,
      type: String,
      action: String
    }
  },
  variables: [{
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'currency', 'percentage']
    },
    required: Boolean,
    defaultValue: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for efficient template lookup
notificationTemplateSchema.index({ type: 1, isActive: 1 });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
