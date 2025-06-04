// Integration tests for Processing Service
const axios = require('axios');

describe('Processing Service Integration Tests', () => {
  const baseURL = global.testConfig.baseURL.processingService;
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

    test('should return processing queue status', async () => {
      const response = await axios.get(`${baseURL}/health/queue`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('queueSize');
      expect(response.data).toHaveProperty('activeJobs');
    });
  });

  describe('PDF Generation', () => {
    test('should generate transaction statement PDF', async () => {
      const jobData = {
        type: 'pdf_generation',
        subType: 'transaction_statement',
        data: {
          userId: 'test-user-id',
          dateRange: {
            start: '2025-01-01',
            end: '2025-06-04'
          },
          format: 'detailed'
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/pdf`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
      expect(response.data).toHaveProperty('status');
    });

    test('should generate portfolio report PDF', async () => {
      const jobData = {
        type: 'pdf_generation',
        subType: 'portfolio_report',
        data: {
          userId: 'test-user-id',
          includeCharts: true,
          includeAnalysis: true
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/pdf`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });
  });

  describe('Financial Calculations', () => {
    test('should perform portfolio analysis', async () => {
      const jobData = {
        type: 'calculation',
        subType: 'portfolio_analysis',
        data: {
          userId: 'test-user-id',
          portfolioData: [
            { symbol: 'AAPL', shares: 10, currentPrice: 150 },
            { symbol: 'GOOGL', shares: 5, currentPrice: 2500 }
          ]
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/calculate`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });

    test('should calculate compound interest', async () => {
      const jobData = {
        type: 'calculation',
        subType: 'compound_interest',
        data: {
          principal: 10000,
          rate: 0.07,
          time: 10,
          compoundFrequency: 12
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/calculate`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });

    test('should perform retirement planning calculation', async () => {
      const jobData = {
        type: 'calculation',
        subType: 'retirement_planning',
        data: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
          expectedReturn: 0.07
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/calculate`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });
  });

  describe('Job Management', () => {
    let jobId;

    test('should create and track a job', async () => {
      const jobData = {
        type: 'calculation',
        subType: 'simple_calculation',
        data: { value: 100 }
      };
      
      const createResponse = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/calculate`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(createResponse.status);
      jobId = createResponse.data.jobId;
      
      // Check job status
      const statusResponse = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/jobs/${jobId}/status`,
        authToken
      );
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data).toHaveProperty('status');
      expect(statusResponse.data).toHaveProperty('progress');
    });

    test('should get job results when completed', async () => {
      if (!jobId) {
        return; // Skip if previous test failed
      }
      
      // Wait for job completion (with timeout)
      let attempts = 0;
      let jobCompleted = false;
      
      while (attempts < 30 && !jobCompleted) {
        const statusResponse = await global.testUtils.authenticatedRequest(
          'get',
          `${baseURL}/api/jobs/${jobId}/status`,
          authToken
        );
        
        if (statusResponse.data.status === 'completed') {
          jobCompleted = true;
        } else if (statusResponse.data.status === 'failed') {
          throw new Error('Job failed');
        }
        
        if (!jobCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      if (jobCompleted) {
        const resultResponse = await global.testUtils.authenticatedRequest(
          'get',
          `${baseURL}/api/jobs/${jobId}/result`,
          authToken
        );
        
        expect(resultResponse.status).toBe(200);
        expect(resultResponse.data).toHaveProperty('result');
      }
    }, 35000);

    test('should get user job history', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/jobs/history`,
        authToken
      );
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.jobs)).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    test('should handle bulk calculations', async () => {
      const jobData = {
        type: 'bulk_calculation',
        data: {
          calculations: [
            { type: 'compound_interest', principal: 1000, rate: 0.05, time: 5 },
            { type: 'compound_interest', principal: 2000, rate: 0.06, time: 10 },
            { type: 'compound_interest', principal: 3000, rate: 0.07, time: 15 }
          ]
        }
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/bulk`,
        authToken,
        jobData
      );
      
      expect([200, 202]).toContain(response.status);
      expect(response.data).toHaveProperty('jobId');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid job types', async () => {
      const jobData = {
        type: 'invalid_type',
        data: {}
      };
      
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/calculate`,
        authToken,
        jobData
      );
      
      expect(response.status).toBe(400);
    });

    test('should handle missing job data', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'post',
        `${baseURL}/api/jobs/calculate`,
        authToken,
        {}
      );
      
      expect(response.status).toBe(400);
    });

    test('should handle non-existent job status requests', async () => {
      const response = await global.testUtils.authenticatedRequest(
        'get',
        `${baseURL}/api/jobs/non-existent-job-id/status`,
        authToken
      );
      
      expect(response.status).toBe(404);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent job submissions', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const jobData = {
          type: 'calculation',
          subType: 'simple_calculation',
          data: { value: i * 10 }
        };
        
        promises.push(
          global.testUtils.authenticatedRequest(
            'post',
            `${baseURL}/api/jobs/calculate`,
            authToken,
            jobData
          )
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect([200, 202]).toContain(response.status);
        expect(response.data).toHaveProperty('jobId');
      });
    }, 15000);
  });

  describe('Metrics', () => {
    test('should expose processing metrics', async () => {
      const response = await axios.get(`${baseURL}/metrics`);
      
      expect(response.status).toBe(200);
      expect(response.data).toContain('job_processing_duration_seconds');
      expect(response.data).toContain('queue_size');
    });
  });
});
