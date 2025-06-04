// Integration tests for API Gateway
const axios = require('axios');

describe('API Gateway Integration Tests', () => {
  const baseURL = global.testConfig.baseURL.apiGateway;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user
    testUser = global.testUtils.generateTestUser();
    
    // Register user through legacy backend (assuming it handles registration)
    const registerResponse = await axios.post(`${global.testConfig.baseURL.legacyBackend}/api/auth/register`, testUser);
    expect(registerResponse.status).toBe(201);
    
    // Authenticate through API Gateway
    authToken = await global.testUtils.authenticate(baseURL, testUser);
  });

  describe('Health Checks', () => {
    test('should return health status', async () => {
      const response = await axios.get(`${baseURL}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('services');
    });

    test('should return detailed health status', async () => {
      const response = await axios.get(`${baseURL}/health/detailed`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('apiGateway');
      expect(response.data).toHaveProperty('services');
    });
  });

  describe('Authentication Proxy', () => {
    test('should proxy login requests', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };
      
      const response = await axios.post(`${baseURL}/api/auth/login`, loginData);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
    });

    test('should reject invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };
      
      const response = await axios.post(`${baseURL}/api/auth/login`, loginData);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Transaction Proxy', () => {
    test('should proxy authenticated transaction requests', async () => {
      const transactionData = global.testUtils.generateTestTransaction();
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/transactions`,
        authToken,
        transactionData
      );
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('_id');
      expect(response.data.amount).toBe(transactionData.amount);
    });

    test('should reject unauthenticated transaction requests', async () => {
      const transactionData = global.testUtils.generateTestTransaction();
      
      const response = await axios.post(`${baseURL}/api/transactions`, transactionData);
      
      expect(response.status).toBe(401);
    });

    test('should get user transactions', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/transactions`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Processing Service Proxy', () => {
    test('should proxy processing requests', async () => {
      const processingData = {
        type: 'portfolio_analysis',
        data: {
          userId: 'test-user-id'
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/processing/analyze`,
        authToken,
        processingData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });
  });

  describe('Notification Service Proxy', () => {
    test('should proxy notification requests', async () => {
      const notificationData = {
        type: 'push',
        title: 'Test Notification',
        message: 'This is a test notification',
        userId: 'test-user-id'
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/notifications/send`,
        authToken,
        notificationData
      );
      
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const promises = [];
      
      // Send many requests quickly
      for (let i = 0; i < 150; i++) {
        promises.push(
          axios.get(`${baseURL}/health`, {
            headers: { 'X-Test-Client': 'rate-limit-test' }
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle invalid routes', async () => {
      const response = await axios.get(`${baseURL}/api/nonexistent`);
      
      expect(response.status).toBe(404);
    });

    test('should handle malformed requests', async () => {
      const response = await axios.post(`${baseURL}/api/transactions`, {
        invalidData: 'test'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Metrics', () => {
    test('should expose Prometheus metrics', async () => {
      const response = await axios.get(`${baseURL}/metrics`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toContain('http_requests_total');
    });
  });
});
