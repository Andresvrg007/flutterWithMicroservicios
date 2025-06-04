// 🏥 HEALTH CHECK ROUTES - SERVICE STATUS MONITORING
// Endpoints para verificar el estado de todos los servicios

const express = require('express');
const axios = require('axios');
const router = express.Router();

const LEGACY_BACKEND_URL = process.env.LEGACY_BACKEND_URL || 'http://localhost:3000';
const PROCESSING_SERVICE_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:8081';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8082';

// Helper function to check service health
const checkServiceHealth = async (serviceName, url) => {
  try {
    const startTime = Date.now();
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    
    return {
      service: serviceName,
      status: 'healthy',
      url: url,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      details: response.data || { message: 'Service is running' }
    };
  } catch (error) {
    return {
      service: serviceName,
      status: 'unhealthy',
      url: url,
      error: error.message,
      timestamp: new Date().toISOString(),
      details: error.response?.data || { message: 'Service unavailable' }
    };
  }
};

// ================================
// 🏥 HEALTH CHECK ENDPOINTS
// ================================

// GET /health - Gateway health check
router.get('/', (req, res) => {
  const healthInfo = {
    service: 'Finance API Gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cpuArchitecture: process.arch
    },
    configuration: {
      port: process.env.PORT || 8080,
      jwtEnabled: !!process.env.JWT_SECRET,
      rateLimitEnabled: !!process.env.RATE_LIMIT_MAX_REQUESTS,
      requestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true'
    }
  };

  res.status(200).json(healthInfo);
});

// GET /health/detailed - Detailed health check with all services
router.get('/detailed', async (req, res) => {
  console.log('🔍 Performing detailed health check...');
  
  const startTime = Date.now();
  
  // Check all services in parallel
  const healthChecks = await Promise.allSettled([
    checkServiceHealth('Legacy Backend', LEGACY_BACKEND_URL),
    checkServiceHealth('Processing Service', PROCESSING_SERVICE_URL),
    checkServiceHealth('Notification Service', NOTIFICATION_SERVICE_URL)
  ]);

  const services = healthChecks.map(result => 
    result.status === 'fulfilled' ? result.value : {
      service: 'Unknown',
      status: 'error',
      error: result.reason?.message || 'Health check failed'
    }
  );

  const totalResponseTime = Date.now() - startTime;
  const healthyServices = services.filter(s => s.status === 'healthy').length;
  const totalServices = services.length;
  
  const overallStatus = healthyServices === totalServices ? 'healthy' : 
                       healthyServices > 0 ? 'degraded' : 'unhealthy';

  const healthInfo = {
    gateway: {
      service: 'Finance API Gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${totalResponseTime}ms`
    },
    summary: {
      overallStatus: overallStatus,
      healthyServices: healthyServices,
      totalServices: totalServices,
      successRate: `${Math.round((healthyServices / totalServices) * 100)}%`
    },
    services: services,
    metadata: {
      checkDuration: `${totalResponseTime}ms`,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 207 : 503;

  res.status(statusCode).json(healthInfo);
});

// GET /health/services/:serviceName - Check specific service
router.get('/services/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  
  let serviceUrl;
  switch (serviceName.toLowerCase()) {
    case 'legacy':
    case 'backend':
      serviceUrl = LEGACY_BACKEND_URL;
      break;
    case 'processing':
      serviceUrl = PROCESSING_SERVICE_URL;
      break;
    case 'notification':
    case 'notifications':
      serviceUrl = NOTIFICATION_SERVICE_URL;
      break;
    default:
      return res.status(404).json({
        error: 'Service not found',
        message: `Service '${serviceName}' is not recognized`,
        availableServices: ['legacy', 'processing', 'notification']
      });
  }

  console.log(`🔍 Checking health for service: ${serviceName}`);
  
  const healthResult = await checkServiceHealth(serviceName, serviceUrl);
  const statusCode = healthResult.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(healthResult);
});

// GET /health/ready - Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check critical services only
    const criticalServices = await Promise.allSettled([
      checkServiceHealth('Legacy Backend', LEGACY_BACKEND_URL)
    ]);

    const allCriticalHealthy = criticalServices.every(result => 
      result.status === 'fulfilled' && result.value.status === 'healthy'
    );

    if (allCriticalHealthy) {
      res.status(200).json({
        status: 'ready',
        message: 'Gateway is ready to serve traffic',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        message: 'Critical services are not available',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      message: 'Readiness check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/live - Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    message: 'Gateway is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
