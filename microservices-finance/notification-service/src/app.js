const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Bull = require('bull');
const Redis = require('redis');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const admin = require('firebase-admin');
const webpush = require('web-push');
const client = require('prom-client');
const cron = require('cron');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3004;
const SOCKET_PORT = process.env.SOCKET_PORT || 3005;
const METRICS_PORT = process.env.METRICS_PORT || 3006;

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const notificationsSent = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['type', 'status', 'channel']
});

const notificationLatency = new client.Histogram({
  name: 'notification_latency_seconds',
  help: 'Notification processing latency',
  labelNames: ['type', 'channel']
});

const activeConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

register.registerMetric(notificationsSent);
register.registerMetric(notificationLatency);
register.registerMetric(activeConnections);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Firebase Admin SDK initialization
if (process.env.FCM_PROJECT_ID) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FCM_PROJECT_ID,
    private_key_id: process.env.FCM_PRIVATE_KEY_ID,
    private_key: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FCM_CLIENT_EMAIL,
    client_id: process.env.FCM_CLIENT_ID,
    auth_uri: process.env.FCM_AUTH_URI,
    token_uri: process.env.FCM_TOKEN_URI
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Web Push setup
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Redis connection
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Job queues
const notificationQueue = new Bull('notifications', process.env.REDIS_URL);
const emailQueue = new Bull('email notifications', process.env.REDIS_URL);
const smsQueue = new Bull('sms notifications', process.env.REDIS_URL);
const pushQueue = new Bull('push notifications', process.env.REDIS_URL);
const scheduledQueue = new Bull('scheduled notifications', process.env.REDIS_URL);

// Models
const DeviceToken = require('./models/DeviceToken');
const NotificationLog = require('./models/NotificationLog');
const NotificationPreference = require('./models/NotificationPreference');
const NotificationTemplate = require('./models/NotificationTemplate');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const notificationLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 3600000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_NOTIFICATIONS) || 100,
  message: 'Too many notification requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/notifications', notificationLimiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    queues: {
      notifications: notificationQueue.name,
      email: emailQueue.name,
      sms: smsQueue.name,
      push: pushQueue.name,
      scheduled: scheduledQueue.name
    },
    connections: io.engine.clientsCount
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Device token management
app.post('/api/devices/register', authenticateToken, async (req, res) => {
  try {
    const { token, platform, deviceId, appVersion } = req.body;
    
    if (!token || !platform) {
      return res.status(400).json({ error: 'Token and platform are required' });
    }

    const deviceToken = await DeviceToken.findOneAndUpdate(
      { userId: req.user.id, deviceId },
      {
        userId: req.user.id,
        token,
        platform,
        deviceId,
        appVersion,
        isActive: true,
        lastUsed: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      deviceToken: {
        id: deviceToken._id,
        token: deviceToken.token,
        platform: deviceToken.platform,
        registeredAt: deviceToken.createdAt
      }
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

app.delete('/api/devices/:deviceId', authenticateToken, async (req, res) => {
  try {
    await DeviceToken.findOneAndUpdate(
      { userId: req.user.id, deviceId: req.params.deviceId },
      { isActive: false }
    );

    res.json({ success: true, message: 'Device unregistered successfully' });
  } catch (error) {
    console.error('Device unregistration error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

// Notification preferences
app.get('/api/preferences', authenticateToken, async (req, res) => {
  try {
    let preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      preferences = new NotificationPreference({
        userId: req.user.id,
        preferences: {
          transactionAlerts: { push: true, email: true, sms: false },
          budgetAlerts: { push: true, email: true, sms: false },
          investmentUpdates: { push: true, email: true, sms: false },
          securityAlerts: { push: true, email: true, sms: true },
          marketNews: { push: false, email: true, sms: false }
        }
      });
      await preferences.save();
    }

    res.json(preferences.preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

app.put('/api/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const updatedPreferences = await NotificationPreference.findOneAndUpdate(
      { userId: req.user.id },
      { preferences },
      { upsert: true, new: true }
    );

    res.json(updatedPreferences.preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Send notification
app.post('/api/notifications/send', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      title, 
      message, 
      channels = ['push'], 
      recipients,
      data = {},
      priority = 'normal',
      scheduled = null
    } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Type, title, and message are required' });
    }

    const notificationData = {
      type,
      title,
      message,
      channels,
      recipients: recipients || [req.user.id],
      data,
      priority,
      senderId: req.user.id,
      createdAt: new Date()
    };

    let job;
    if (scheduled) {
      job = await scheduledQueue.add('scheduled-notification', notificationData, {
        delay: new Date(scheduled) - new Date(),
        attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.RETRY_DELAY) || 5000,
        }
      });
    } else {
      job = await notificationQueue.add('send-notification', notificationData, {
        attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.RETRY_DELAY) || 5000,
        }
      });
    }

    res.json({
      success: true,
      jobId: job.id,
      status: scheduled ? 'scheduled' : 'queued',
      scheduledFor: scheduled,
      message: `Notification ${scheduled ? 'scheduled' : 'queued'} successfully`
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Bulk notification
app.post('/api/notifications/bulk', authenticateToken, async (req, res) => {
  try {
    const { notifications } = req.body;
    
    if (!notifications || !Array.isArray(notifications)) {
      return res.status(400).json({ error: 'Notifications array is required' });
    }

    const jobs = await Promise.all(
      notifications.map(notification => 
        notificationQueue.add('send-notification', {
          ...notification,
          senderId: req.user.id,
          createdAt: new Date()
        }, {
          attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
          backoff: {
            type: 'exponential',
            delay: parseInt(process.env.RETRY_DELAY) || 5000,
          }
        })
      )
    );

    res.json({
      success: true,
      jobIds: jobs.map(job => job.id),
      count: jobs.length,
      message: `${jobs.length} notifications queued successfully`
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// Get notification status
app.get('/api/notifications/:jobId/status', authenticateToken, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    
    let job = await notificationQueue.getJob(jobId) || 
              await scheduledQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Notification job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();
    
    let result = null;
    let error = null;
    
    if (state === 'completed') {
      result = job.returnvalue;
    } else if (state === 'failed') {
      error = job.failedReason;
    }

    res.json({
      jobId: job.id,
      status: state,
      progress,
      result,
      error,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn
    });
  } catch (error) {
    console.error('Get notification status error:', error);
    res.status(500).json({ error: 'Failed to get notification status' });
  }
});

// Notification history
app.get('/api/notifications/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const query = { 
      $or: [
        { senderId: req.user.id },
        { recipients: req.user.id }
      ]
    };
    
    if (type) query.type = type;
    if (status) query.status = status;

    const notifications = await NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-data -error');

    const total = await NotificationLog.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Failed to get notification history' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  activeConnections.inc();
  
  socket.on('authenticate', (token) => {
    const jwt = require('jsonwebtoken');
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = user.id;
      socket.join(`user_${user.id}`);
      console.log(`User ${user.id} authenticated and joined room`);
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { error: 'Invalid token' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    activeConnections.dec();
  });
});

// Queue statistics
app.get('/api/queues/stats', authenticateToken, async (req, res) => {
  try {
    const [notificationStats, emailStats, smsStats, pushStats, scheduledStats] = await Promise.all([
      notificationQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      smsQueue.getJobCounts(),
      pushQueue.getJobCounts(),
      scheduledQueue.getJobCounts()
    ]);

    res.json({
      notifications: notificationStats,
      email: emailStats,
      sms: smsStats,
      push: pushStats,
      scheduled: scheduledStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Notification service error:', error);
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Cleanup jobs (run every hour)
const cleanupJob = new cron.CronJob('0 * * * *', async () => {
  try {
    console.log('Running notification cleanup job');
    
    // Clean completed jobs older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    await Promise.all([
      notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      emailQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      smsQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      pushQueue.clean(24 * 60 * 60 * 1000, 'completed')
    ]);
    
    // Clean old notification logs
    await NotificationLog.deleteMany({
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
    });
    
    console.log('Notification cleanup completed');
  } catch (error) {
    console.error('Cleanup job error:', error);
  }
});

cleanupJob.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  cleanupJob.stop();
  
  await Promise.all([
    notificationQueue.close(),
    emailQueue.close(),
    smsQueue.close(),
    pushQueue.close(),
    scheduledQueue.close(),
    redis.quit()
  ]);
  
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  cleanupJob.stop();
  
  await Promise.all([
    notificationQueue.close(),
    emailQueue.close(),
    smsQueue.close(),
    pushQueue.close(),
    scheduledQueue.close(),
    redis.quit()
  ]);
  
  server.close(() => {
    process.exit(0);
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_notifications', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Start servers
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});

server.listen(SOCKET_PORT, () => {
  console.log(`Socket.IO server running on port ${SOCKET_PORT}`);
});

// Start metrics server
const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

metricsApp.listen(METRICS_PORT, () => {
  console.log(`Metrics server running on port ${METRICS_PORT}`);
});

// Export for testing
module.exports = { app, io };
