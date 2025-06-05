const Bull = require('bull');
const Redis = require('redis');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const webpush = require('web-push');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Models
const DeviceToken = require('../models/DeviceToken');
const NotificationLog = require('../models/NotificationLog');
const NotificationPreference = require('../models/NotificationPreference');

// Initialize Redis
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Initialize queues
const notificationQueue = new Bull('notifications', process.env.REDIS_URL);
const emailQueue = new Bull('email notifications', process.env.REDIS_URL);
const smsQueue = new Bull('sms notifications', process.env.REDIS_URL);
const pushQueue = new Bull('push notifications', process.env.REDIS_URL);
const scheduledQueue = new Bull('scheduled notifications', process.env.REDIS_URL);

// Email transporter (with fallback to console)
let emailTransporter = null;
try {
  if (process.env.SMTP_HOST) {
    emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('✅ Email transporter configured');
  } else {
    console.log('📧 SMTP not configured, using console simulation');
  }
} catch (error) {
  console.log('⚠️  Email configuration failed:', error.message);
  console.log('📧 Using console simulation for emails');
}

// SMS client (with fallback to console)
let smsClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ SMS client configured');
  } else {
    console.log('📱 Twilio not configured, using console simulation');
  }
} catch (error) {
  console.log('⚠️  SMS configuration failed:', error.message);
  console.log('📱 Using console simulation for SMS');
}

// Utility functions
const logNotification = async (notificationData, status, error = null, result = null) => {
  try {
    const log = new NotificationLog({
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      recipients: notificationData.recipients,
      channels: notificationData.channels,
      status,
      senderId: notificationData.senderId,
      data: notificationData.data,
      error: error ? error.message : null,
      result,
      createdAt: notificationData.createdAt || new Date(),
      processedAt: new Date()
    });
    
    await log.save();
    return log;
  } catch (logError) {
    console.error('Failed to log notification:', logError);
  }
};

const getUserPreferences = async (userId) => {
  try {
    const preferences = await NotificationPreference.findOne({ userId });
    return preferences ? preferences.preferences : null;
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    return null;
  }
};

const getUserDevices = async (userId) => {
  try {
    const devices = await DeviceToken.find({ userId, isActive: true });
    return devices;
  } catch (error) {
    console.error('Failed to get user devices:', error);
    return [];
  }
};

// Console simulation functions
const simulateConsoleNotification = {
  push: (data) => {
    console.log('\n🔔 ===== PUSH NOTIFICATION SIMULATION =====');
    console.log(`📱 Device ID: ${data.deviceId || 'device-' + Math.random().toString(36).substr(2, 9)}`);
    console.log(`📱 Platform: ${data.platform || 'Unknown'}`);
    console.log(`📋 Title: ${data.title}`);
    console.log(`💬 Message: ${data.message}`);
    console.log(`👤 User ID: ${data.userId}`);
    console.log(`🏷️  Notification Type: ${data.type}`);
    console.log(`🔔 FCM Token: ${data.token || 'fcm-token-' + Math.random().toString(36).substr(2, 15)}`);
    if (data.data && Object.keys(data.data).length > 0) {
      console.log(`📊 Payload: ${JSON.stringify(data.data, null, 2)}`);
    }
    console.log(`⏰ Sent At: ${new Date().toISOString()}`);
    if (data.error) {
      console.log(`❌ Error: ${data.error}`);
    }
    console.log('============================================\n');
  },
  
  email: (data) => {
    console.log('\n📧 ===== EMAIL NOTIFICATION SIMULATION =====');
    console.log(`📮 To: ${data.email || data.userId + '@finance-app.com'}`);
    console.log(`📋 Subject: ${data.title}`);
    console.log(`💬 Body: ${data.message}`);
    console.log(`👤 User: ${data.userId}`);
    console.log(`🏷️  Type: ${data.type}`);
    console.log(`📊 Data: ${JSON.stringify(data.data, null, 2)}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('===========================================\n');
  },
  
  sms: (data) => {
    console.log('\n📱 ===== SMS NOTIFICATION SIMULATION =====');
    console.log(`📞 To: ${data.phone || '+1234567890'}`);
    console.log(`💬 Message: ${data.message}`);
    console.log(`👤 User: ${data.userId}`);
    console.log(`🏷️  Type: ${data.type}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('==========================================\n');
  },
  
  websocket: (data) => {
    console.log('\n🌐 ===== WEBSOCKET NOTIFICATION SIMULATION =====');
    console.log(`🔗 Room: user_${data.userId}`);
    console.log(`📋 Title: ${data.title}`);
    console.log(`💬 Message: ${data.message}`);
    console.log(`👤 User: ${data.userId}`);
    console.log(`🏷️  Type: ${data.type}`);
    console.log(`📊 Data: ${JSON.stringify(data.data, null, 2)}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('===============================================\n');
  }
};

// Main notification processor
notificationQueue.process('send-notification', async (job) => {
  const { data: notificationData } = job;
  console.log(`\n🚀 Processing notification job ${job.id}:`, notificationData.type);
  
  try {
    const results = {};
    const errors = [];
    
    // Process each recipient
    for (const userId of notificationData.recipients) {
      console.log(`👤 Processing for user: ${userId}`);
      
      // Get user preferences
      const preferences = await getUserPreferences(userId);
      
      // Process each channel
      for (const channel of notificationData.channels) {
        try {
          // Check if user has this channel enabled
          if (preferences && preferences[notificationData.type] && !preferences[notificationData.type][channel]) {
            console.log(`⚠️  Channel ${channel} disabled for user ${userId} and type ${notificationData.type}`);
            continue;
          }
          
          switch (channel) {
            case 'push':
              await pushQueue.add('send-push', {
                ...notificationData,
                userId,
                channel: 'push'
              });
              results[`${userId}_push`] = 'queued';
              break;
              
            case 'email':
              await emailQueue.add('send-email', {
                ...notificationData,
                userId,
                channel: 'email'
              });
              results[`${userId}_email`] = 'queued';
              break;
              
            case 'sms':
              await smsQueue.add('send-sms', {
                ...notificationData,
                userId,
                channel: 'sms'
              });
              results[`${userId}_sms`] = 'queued';
              break;
              
            case 'websocket':
              // Process websocket immediately
              simulateConsoleNotification.websocket({
                ...notificationData,
                userId
              });
              results[`${userId}_websocket`] = 'sent';
              break;
          }
        } catch (channelError) {
          console.error(`❌ Error processing ${channel} for user ${userId}:`, channelError);
          errors.push(`${channel}:${userId} - ${channelError.message}`);
        }
      }
    }
    
    // Log the notification
    await logNotification(notificationData, 'processed', null, results);
    
    console.log(`✅ Notification job ${job.id} completed successfully`);
    return {
      success: true,
      results,
      errors: errors.length > 0 ? errors : null,
      processedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Error processing notification job ${job.id}:`, error);
    await logNotification(notificationData, 'failed', error);
    throw error;
  }
});

// Push notification processor
pushQueue.process('send-push', async (job) => {
  const { data: notificationData } = job;
  console.log(`🔔 Processing push notification for user: ${notificationData.userId}`);
  
  try {
    // Get user devices
    const devices = await getUserDevices(notificationData.userId);
    
    if (devices.length === 0) {
      console.log(`⚠️  No devices found for user ${notificationData.userId}`);
      simulateConsoleNotification.push({
        ...notificationData,
        platform: 'No devices registered'
      });
      return { success: true, message: 'No devices to send to', simulation: true };
    }
    
    const results = [];
    
    for (const device of devices) {
      try {
        // Try Firebase FCM first
        if (admin.apps.length > 0) {
          const message = {
            notification: {
              title: notificationData.title,
              body: notificationData.message
            },
            data: {
              type: notificationData.type,
              ...notificationData.data
            },
            token: device.token
          };
          
          const response = await admin.messaging().send(message);
          console.log(`✅ FCM sent to device ${device.deviceId}:`, response);
          results.push({ deviceId: device.deviceId, status: 'sent', messageId: response });        } else {
          // Simulate push notification
          simulateConsoleNotification.push({
            ...notificationData,
            platform: device.platform,
            deviceId: device.deviceId,
            token: device.token
          });
          results.push({ deviceId: device.deviceId, status: 'simulated' });
        }
        
        // Update device last used
        device.lastUsed = new Date();
        await device.save();
        
      } catch (deviceError) {
        console.error(`❌ Failed to send push to device ${device.deviceId}:`, deviceError);
        
        // If token is invalid, deactivate device
        if (deviceError.code === 'messaging/registration-token-not-registered') {
          device.isActive = false;
          await device.save();
        }
          // Still simulate for console
        simulateConsoleNotification.push({
          ...notificationData,
          platform: device.platform,
          deviceId: device.deviceId,
          token: device.token,
          error: deviceError.message
        });
        
        results.push({ 
          deviceId: device.deviceId, 
          status: 'failed', 
          error: deviceError.message,
          simulation: true
        });
      }
    }
    
    return {
      success: true,
      results,
      deviceCount: devices.length,
      processedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Push notification processing error:', error);
    
    // Fallback to console simulation
    simulateConsoleNotification.push({
      ...notificationData,
      error: error.message
    });
    
    throw error;
  }
});

// Email notification processor
emailQueue.process('send-email', async (job) => {
  const { data: notificationData } = job;
  console.log(`📧 Processing email notification for user: ${notificationData.userId}`);
  
  try {
    const emailData = {
      to: notificationData.email || `${notificationData.userId}@finance-app.com`,
      subject: notificationData.title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notificationData.title}</h2>
          <p style="color: #666; font-size: 16px;">${notificationData.message}</p>
          ${notificationData.data && Object.keys(notificationData.data).length > 0 ? `
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Additional Information:</h3>
              <pre style="color: #666;">${JSON.stringify(notificationData.data, null, 2)}</pre>
            </div>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This notification was sent from your Finance App.<br>
            Type: ${notificationData.type} | Time: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `${notificationData.title}\n\n${notificationData.message}\n\nType: ${notificationData.type}\nTime: ${new Date().toISOString()}`
    };
    
    if (emailTransporter) {
      try {
        const result = await emailTransporter.sendMail(emailData);
        console.log(`✅ Email sent successfully:`, result.messageId);
        return {
          success: true,
          messageId: result.messageId,
          recipient: emailData.to,
          processedAt: new Date().toISOString()
        };
      } catch (smtpError) {
        console.error('❌ SMTP error:', smtpError);
        // Fall back to console simulation
        simulateConsoleNotification.email({
          ...notificationData,
          email: emailData.to,
          error: smtpError.message
        });
        return {
          success: true,
          simulation: true,
          error: smtpError.message,
          recipient: emailData.to
        };
      }
    } else {
      // Console simulation
      simulateConsoleNotification.email({
        ...notificationData,
        email: emailData.to
      });
      return {
        success: true,
        simulation: true,
        recipient: emailData.to,
        processedAt: new Date().toISOString()
      };
    }
    
  } catch (error) {
    console.error('❌ Email notification processing error:', error);
    
    // Fallback to console simulation
    simulateConsoleNotification.email({
      ...notificationData,
      error: error.message
    });
    
    throw error;
  }
});

// SMS notification processor
smsQueue.process('send-sms', async (job) => {
  const { data: notificationData } = job;
  console.log(`📱 Processing SMS notification for user: ${notificationData.userId}`);
  
  try {
    const phoneNumber = notificationData.phone || '+1234567890'; // Default for simulation
    const message = `${notificationData.title}\n\n${notificationData.message}\n\nType: ${notificationData.type}`;
    
    if (smsClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const result = await smsClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        console.log(`✅ SMS sent successfully:`, result.sid);
        return {
          success: true,
          messageSid: result.sid,
          recipient: phoneNumber,
          processedAt: new Date().toISOString()
        };
      } catch (twilioError) {
        console.error('❌ Twilio error:', twilioError);
        // Fall back to console simulation
        simulateConsoleNotification.sms({
          ...notificationData,
          phone: phoneNumber,
          error: twilioError.message
        });
        return {
          success: true,
          simulation: true,
          error: twilioError.message,
          recipient: phoneNumber
        };
      }
    } else {
      // Console simulation
      simulateConsoleNotification.sms({
        ...notificationData,
        phone: phoneNumber
      });
      return {
        success: true,
        simulation: true,
        recipient: phoneNumber,
        processedAt: new Date().toISOString()
      };
    }
    
  } catch (error) {
    console.error('❌ SMS notification processing error:', error);
    
    // Fallback to console simulation
    simulateConsoleNotification.sms({
      ...notificationData,
      error: error.message
    });
    
    throw error;
  }
});

// Scheduled notification processor
scheduledQueue.process('scheduled-notification', async (job) => {
  const { data: notificationData } = job;
  console.log(`⏰ Processing scheduled notification: ${notificationData.type}`);
  
  try {
    // Add to main notification queue for processing
    const newJob = await notificationQueue.add('send-notification', notificationData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      }
    });
    
    console.log(`✅ Scheduled notification moved to main queue: ${newJob.id}`);
    return {
      success: true,
      newJobId: newJob.id,
      originalScheduledJob: job.id,
      processedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Scheduled notification processing error:', error);
    throw error;
  }
});

// Error handlers
notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Notification job ${job.id} failed:`, err.message);
});

pushQueue.on('failed', (job, err) => {
  console.error(`❌ Push notification job ${job.id} failed:`, err.message);
});

emailQueue.on('failed', (job, err) => {
  console.error(`❌ Email notification job ${job.id} failed:`, err.message);
});

smsQueue.on('failed', (job, err) => {
  console.error(`❌ SMS notification job ${job.id} failed:`, err.message);
});

scheduledQueue.on('failed', (job, err) => {
  console.error(`❌ Scheduled notification job ${job.id} failed:`, err.message);
});

// Success handlers
notificationQueue.on('completed', (job, result) => {
  console.log(`✅ Notification job ${job.id} completed:`, result.success ? 'SUCCESS' : 'PARTIAL');
});

pushQueue.on('completed', (job, result) => {
  console.log(`✅ Push notification job ${job.id} completed for ${result.deviceCount || 0} devices`);
});

emailQueue.on('completed', (job, result) => {
  console.log(`✅ Email notification job ${job.id} completed:`, result.simulation ? 'SIMULATED' : 'SENT');
});

smsQueue.on('completed', (job, result) => {
  console.log(`✅ SMS notification job ${job.id} completed:`, result.simulation ? 'SIMULATED' : 'SENT');
});

scheduledQueue.on('completed', (job, result) => {
  console.log(`✅ Scheduled notification job ${job.id} moved to main queue`);
});

console.log('🎯 Notification workers initialized and ready to process jobs');

module.exports = {
  notificationQueue,
  emailQueue,
  smsQueue,
  pushQueue,
  scheduledQueue,
  simulateConsoleNotification
};
