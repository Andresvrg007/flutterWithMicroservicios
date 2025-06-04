const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  preferences: {
    transactionAlerts: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      threshold: { type: Number, default: 0 } // Minimum amount to trigger alert
    },
    budgetAlerts: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      warningThreshold: { type: Number, default: 80 }, // Percentage of budget used
      criticalThreshold: { type: Number, default: 95 }
    },
    investmentUpdates: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      frequency: { 
        type: String, 
        enum: ['real-time', 'daily', 'weekly'], 
        default: 'daily' 
      },
      priceChangeThreshold: { type: Number, default: 5 } // Percentage change
    },
    securityAlerts: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true }
    },
    marketNews: {
      push: { type: Boolean, default: false },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      categories: [{
        type: String,
        enum: ['stocks', 'crypto', 'forex', 'commodities', 'bonds']
      }]
    },
    paymentReminders: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      daysBefore: { type: Number, default: 3 }
    },
    goalMilestones: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    systemNotifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '22:00' }, // 24-hour format
    endTime: { type: String, default: '08:00' },
    timezone: { type: String, default: 'UTC' }
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
