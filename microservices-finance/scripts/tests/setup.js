// Test setup and global configuration
const axios = require('axios');

// Global test configuration
global.testConfig = {
  baseURL: {
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:8080',
    processingService: process.env.PROCESSING_SERVICE_URL || 'http://localhost:8081',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8082',
    legacyBackend: process.env.LEGACY_BACKEND_URL || 'http://localhost:3000'
  },
  timeout: parseInt(process.env.TIMEOUT) || 30000,
  retries: 3
};

// Global axios configuration
axios.defaults.timeout = global.testConfig.timeout;
axios.defaults.validateStatus = () => true; // Don't throw on HTTP errors

// Test utilities
global.testUtils = {
  // Wait for service to be ready
  async waitForService(url, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${url}/health`);
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Service at ${url} not ready after ${maxAttempts} attempts`);
  },

  // Generate test data
  generateTestUser() {
    const timestamp = Date.now();
    return {
      email: `test${timestamp}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
      tier: 'free'
    };
  },

  generateTestTransaction() {
    return {
      amount: Math.floor(Math.random() * 1000) + 1,
      description: `Test transaction ${Date.now()}`,
      type: 'expense',
      category: 'food',
      date: new Date().toISOString()
    };
  },

  // Authentication helpers
  async authenticate(baseURL, user) {
    const response = await axios.post(`${baseURL}/api/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    if (response.status !== 200) {
      throw new Error(`Authentication failed: ${response.data.message}`);
    }
    
    return response.data.token;
  },

  // Request helpers with auth
  async authenticatedRequest(method, url, token, data = null) {
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    return await axios(config);
  }
};

// Global setup
beforeAll(async () => {
  console.log('🚀 Starting integration tests...');
  console.log('Configuration:', global.testConfig);
  
  // Wait for all services to be ready
  const services = Object.entries(global.testConfig.baseURL);
  
  for (const [name, url] of services) {
    console.log(`⏳ Waiting for ${name} at ${url}...`);
    try {
      await global.testUtils.waitForService(url);
      console.log(`✅ ${name} is ready`);
    } catch (error) {
      console.error(`❌ ${name} failed to start: ${error.message}`);
      throw error;
    }
  }
  
  console.log('🎉 All services are ready!');
});

// Global cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up after tests...');
  // Add any global cleanup here
});
