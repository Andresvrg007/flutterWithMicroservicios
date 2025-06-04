const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['ios', 'android', 'web']
  },
  deviceId: {
    type: String,
    required: true
  },
  appVersion: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for user and device
deviceTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Index for cleanup of inactive tokens
deviceTokenSchema.index({ lastUsed: 1, isActive: 1 });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
