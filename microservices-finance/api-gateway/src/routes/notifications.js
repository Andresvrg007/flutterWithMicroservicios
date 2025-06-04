// 🔔 NOTIFICATION ROUTES - PUSH NOTIFICATIONS & ALERTS
// Maneja el envío de notificaciones push y alertas

const express = require('express');
const axios = require('axios');
const router = express.Router();

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8082';

// Helper function to proxy notification requests
const proxyNotificationRequest = async (req, res, method, endpoint) => {
  try {
    const config = {
      method: method,
      url: `${NOTIFICATION_SERVICE_URL}/api${endpoint}`,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
      },
      timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      config.data = req.body;
    }

    // Add query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      config.params = req.query;
    }

    console.log(`🔔 NOTIFICATION PROXY: ${method} ${endpoint} -> ${config.url}`);

    const response = await axios(config);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error(`🚨 NOTIFICATION PROXY ERROR: ${method} ${endpoint}`, error.message);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      res.status(503).json({
        error: 'Notification Service Unavailable',
        message: 'Notification service is not responding',
        service: 'notifications',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Notification Proxy Error',
        message: 'Failed to process notification request',
        details: error.message
      });
    }
  }
};

// ================================
// 📱 PUSH NOTIFICATIONS
// ================================

// POST /api/notifications/send - Send push notification
router.post('/send', async (req, res) => {
  console.log(`📱 Push notification request for user: ${req.body.userId}`);
  await proxyNotificationRequest(req, res, 'POST', '/send');
});

// POST /api/notifications/send/bulk - Send bulk notifications
router.post('/send/bulk', async (req, res) => {
  console.log(`📱 Bulk notification request for ${req.body.userIds?.length || 0} users`);
  await proxyNotificationRequest(req, res, 'POST', '/send/bulk');
});

// POST /api/notifications/broadcast - Broadcast to all users
router.post('/broadcast', async (req, res) => {
  console.log('📢 Broadcast notification request');
  await proxyNotificationRequest(req, res, 'POST', '/broadcast');
});

// ================================
// 🔧 DEVICE MANAGEMENT
// ================================

// POST /api/notifications/register-device - Register device for push notifications
router.post('/register-device', async (req, res) => {
  console.log(`📱 Device registration for user: ${req.body.userId}`);
  await proxyNotificationRequest(req, res, 'POST', '/register-device');
});

// DELETE /api/notifications/unregister-device - Unregister device
router.delete('/unregister-device', async (req, res) => {
  console.log(`📱 Device unregistration for user: ${req.body.userId}`);
  await proxyNotificationRequest(req, res, 'DELETE', '/unregister-device');
});

// GET /api/notifications/devices/:userId - Get user's registered devices
router.get('/devices/:userId', async (req, res) => {
  await proxyNotificationRequest(req, res, 'GET', `/devices/${req.params.userId}`);
});

// ================================
// 🎯 TARGETED NOTIFICATIONS
// ================================

// POST /api/notifications/transaction-alert - Transaction-based alert
router.post('/transaction-alert', async (req, res) => {
  console.log('💰 Transaction alert notification');
  await proxyNotificationRequest(req, res, 'POST', '/transaction-alert');
});

// POST /api/notifications/budget-alert - Budget warning
router.post('/budget-alert', async (req, res) => {
  console.log('⚠️ Budget alert notification');
  await proxyNotificationRequest(req, res, 'POST', '/budget-alert');
});

// POST /api/notifications/report-ready - Report completion notification
router.post('/report-ready', async (req, res) => {
  console.log('📄 Report ready notification');
  await proxyNotificationRequest(req, res, 'POST', '/report-ready');
});

// POST /api/notifications/security-alert - Security-related alert
router.post('/security-alert', async (req, res) => {
  console.log('🔒 Security alert notification');
  await proxyNotificationRequest(req, res, 'POST', '/security-alert');
});

// ================================
// 📊 NOTIFICATION PREFERENCES
// ================================

// GET /api/notifications/preferences/:userId - Get notification preferences
router.get('/preferences/:userId', async (req, res) => {
  await proxyNotificationRequest(req, res, 'GET', `/preferences/${req.params.userId}`);
});

// PUT /api/notifications/preferences/:userId - Update notification preferences
router.put('/preferences/:userId', async (req, res) => {
  console.log(`⚙️ Notification preferences update for user: ${req.params.userId}`);
  await proxyNotificationRequest(req, res, 'PUT', `/preferences/${req.params.userId}`);
});

// ================================
// 📈 NOTIFICATION HISTORY & ANALYTICS
// ================================

// GET /api/notifications/history/:userId - Get notification history
router.get('/history/:userId', async (req, res) => {
  await proxyNotificationRequest(req, res, 'GET', `/history/${req.params.userId}`);
});

// GET /api/notifications/stats/:userId - Get notification statistics
router.get('/stats/:userId', async (req, res) => {
  await proxyNotificationRequest(req, res, 'GET', `/stats/${req.params.userId}`);
});

// PUT /api/notifications/mark-read/:notificationId - Mark notification as read
router.put('/mark-read/:notificationId', async (req, res) => {
  await proxyNotificationRequest(req, res, 'PUT', `/mark-read/${req.params.notificationId}`);
});

// DELETE /api/notifications/:notificationId - Delete notification
router.delete('/:notificationId', async (req, res) => {
  await proxyNotificationRequest(req, res, 'DELETE', `/${req.params.notificationId}`);
});

// ================================
// 🔧 NOTIFICATION SERVICE STATUS
// ================================

// GET /api/notifications/health - Notification service health
router.get('/health', async (req, res) => {
  await proxyNotificationRequest(req, res, 'GET', '/health');
});

// GET /api/notifications/service-stats - Notification service statistics
router.get('/service-stats', async (req, res) => {
  await proxyNotificationRequest(req, res, 'GET', '/service-stats');
});

module.exports = router;
