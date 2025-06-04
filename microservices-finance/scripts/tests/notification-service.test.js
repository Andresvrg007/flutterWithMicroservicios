// Integration tests for Notification Service
const axios = require('axios');

describe('Notification Service Integration Tests', () => {
  const baseURL = global.testConfig.baseURL.notificationService;
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = global.testUtils.generateTestUser();
    
    // Register and authenticate user
    const registerResponse = await axios.post(`${global.testConfig.baseURL.legacyBackend}/api/auth/register`, testUser);
    expect(registerResponse.status).toBe(201);
    
    authToken = await global.testUtils.authenticate(global.testConfig.baseURL.apiGateway, testUser);
  });

  describe('Health Checks', () => {
    test('should return health status', async () => {
      const response = await axios.get(`${baseURL}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
    });

    test('should return notification queue status', async () => {
      const response = await axios.get(`${baseURL}/health/queue`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('queueSize');
      expect(response.data).toHaveProperty('activeJobs');
    });
  });

  describe('Push Notifications', () => {
    test('should send push notification', async () => {
      const notificationData = {
        type: 'push',
        title: 'Test Push Notification',
        message: 'This is a test push notification from integration tests',
        userId: 'test-user-id',
        priority: 'normal',
        data: {
          action: 'view_transaction',
          transactionId: 'test-transaction-id'
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/push`,
        authToken,
        notificationData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('notificationId');
    });

    test('should register device token', async () => {
      const tokenData = {
        deviceToken: 'test-device-token-' + Date.now(),
        platform: 'ios',
        userId: 'test-user-id'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/devices/register`,
        authToken,
        tokenData
      );
      
      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('success', true);
    });

    test('should send notification to specific device', async () => {
      // First register a device
      const tokenData = {
        deviceToken: 'specific-device-token-' + Date.now(),
        platform: 'android',
        userId: 'test-user-id'
      };
      
      await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/devices/register`,
        authToken,
        tokenData
      );
      
      // Then send notification to that device
      const notificationData = {
        type: 'push',
        title: 'Device-specific Notification',
        message: 'This notification is for a specific device',
        deviceToken: tokenData.deviceToken,
        priority: 'high'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/push`,
        authToken,
        notificationData
      );
      
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('Email Notifications', () => {
    test('should send email notification', async () => {
      const emailData = {
        type: 'email',
        to: testUser.email,
        subject: 'Test Email Notification',
        template: 'transaction_alert',
        data: {
          userName: testUser.firstName,
          transactionAmount: 150.50,
          transactionType: 'expense',
          transactionDate: new Date().toISOString()
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/email`,
        authToken,
        emailData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('notificationId');
    });

    test('should send bulk email notifications', async () => {
      const bulkEmailData = {
        type: 'bulk_email',
        template: 'monthly_report',
        recipients: [
          {
            email: testUser.email,
            data: {
              userName: testUser.firstName,
              reportMonth: 'June 2025'
            }
          }
        ]
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/email/bulk`,
        authToken,
        bulkEmailData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });
  });

  describe('SMS Notifications', () => {
    test('should send SMS notification', async () => {
      const smsData = {
        type: 'sms',
        to: '+1234567890', // Test phone number
        message: 'Test SMS: Your transaction of $100 has been processed.',
        userId: 'test-user-id'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/sms`,
        authToken,
        smsData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('notificationId');
    });
  });

  describe('In-App Notifications', () => {
    test('should create in-app notification', async () => {
      const inAppData = {
        type: 'in_app',
        title: 'New Feature Available',
        message: 'Check out our new portfolio analysis feature!',
        userId: 'test-user-id',
        category: 'feature_announcement',
        actionUrl: '/portfolio/analysis'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/in-app`,
        authToken,
        inAppData
      );
      
      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('notificationId');
    });

    test('should get user in-app notifications', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/notifications/in-app/user/test-user-id`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.notifications)).toBe(true);
    });

    test('should mark notification as read', async () => {
      // First create a notification
      const inAppData = {
        type: 'in_app',
        title: 'Mark as Read Test',
        message: 'This notification will be marked as read',
        userId: 'test-user-id'
      };
      
      const createResponse = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/in-app`,
        authToken,
        inAppData
      );
      
      const notificationId = createResponse.data.notificationId;
      
      // Mark as read
      const markReadResponse = await global.testUtils.authenticatedRequest(
        'patch',
        `${baseURL}/api/notifications/${notificationId}/read`,
        authToken
      );
      
      expect(markReadResponse.status).toBe(200);
      expect(markReadResponse.data).toHaveProperty('success', true);
    });
  });

  describe('WebSocket Notifications', () => {
    test('should handle WebSocket connection info', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/websocket/info`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('socketUrl');
      expect(response.data).toHaveProperty('connectionToken');
    });
  });

  describe('Notification Preferences', () => {
    test('should get user notification preferences', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/preferences/test-user-id`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('preferences');
    });

    test('should update notification preferences', async () => {
      const preferences = {
        push: {
          enabled: true,
          transactionAlerts: true,
          monthlyReports: false
        },
        email: {
          enabled: true,
          transactionAlerts: false,
          monthlyReports: true
        },
        sms: {
          enabled: false
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'put',
        `${baseURL}/api/preferences/test-user-id`,
        authToken,
        preferences
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });
  });

  describe('Notification Templates', () => {
    test('should get available templates', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/templates`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.templates)).toBe(true);
    });

    test('should get specific template', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/templates/transaction_alert`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('template');
      expect(response.data.template).toHaveProperty('name', 'transaction_alert');
    });
  });

  describe('Notification History', () => {
    test('should get notification history for user', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/history/test-user-id?limit=10&page=1`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.notifications)).toBe(true);
      expect(response.data).toHaveProperty('pagination');
    });

    test('should get notification statistics', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/stats/test-user-id`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('totalSent');
      expect(response.data).toHaveProperty('byType');
      expect(response.data).toHaveProperty('byStatus');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid notification type', async () => {
      const invalidData = {
        type: 'invalid_type',
        message: 'This should fail'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/send`,
        authToken,
        invalidData
      );
      
      expect(response.status).toBe(400);
    });

    test('should handle missing required fields', async () => {
      const incompleteData = {
        type: 'push'
        // Missing title and message
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/push`,
        authToken,
        incompleteData
      );
      
      expect(response.status).toBe(400);
    });

    test('should handle invalid device token format', async () => {
      const invalidTokenData = {
        deviceToken: 'invalid-token',
        platform: 'invalid-platform',
        userId: 'test-user-id'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/devices/register`,
        authToken,
        invalidTokenData
      );
      
      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent notification requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const notificationData = {
          type: 'in_app',
          title: `Concurrent Test ${i}`,
          message: `This is concurrent notification ${i}`,
          userId: 'test-user-id'
        };
        
        promises.push(
          global.testUtils.authenticatedRequest(
            'post',
            `${baseURL}/api/notifications/in-app`,
            authToken,
            notificationData
          )
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect([200, 201, 202]).toContain(response.status);
        expect(response.data).toHaveProperty('notificationId');
      });
    }, 15000);
  });

  describe('Metrics', () => {
    test('should expose notification metrics', async () => {
      const response = await axios.get(`${baseURL}/metrics`);
      
      expect(response.status).toBe(200);
      expect(response.data).toContain('notifications_sent_total');
      expect(response.data).toContain('notification_queue_size');
    });
  });
});
