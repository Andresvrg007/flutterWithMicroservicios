const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'transaction_alert',
      'budget_alert',
      'investment_update',
      'security_alert',
      'market_news',
      'payment_reminder',
      'goal_milestone',
      'system_notification'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  channels: [{
    type: String,
    enum: ['push', 'email', 'sms', 'websocket']
  }],
  recipients: [{
    type: String,
    required: true
  }],
  senderId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  results: [{
    channel: String,
    recipient: String,
    status: {
      type: String,
      enum: ['sent', 'failed', 'delivered', 'bounced']
    },
    error: String,
    sentAt: Date,
    deliveredAt: Date
  }],
  scheduledFor: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  error: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationLogSchema.index({ senderId: 1, createdAt: -1 });
notificationLogSchema.index({ recipients: 1, createdAt: -1 });
notificationLogSchema.index({ type: 1, status: 1 });
notificationLogSchema.index({ scheduledFor: 1 });
notificationLogSchema.index({ createdAt: 1 }); // For cleanup

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
