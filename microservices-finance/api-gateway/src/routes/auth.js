// 🔐 AUTH ROUTES - PROXY TO AUTH SERVICE
// Maneja autenticación (login, register, etc.)

const express = require('express');
const axios = require('axios');
const router = express.Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://legacy-backend:3000';

// Helper function to proxy auth requests
const proxyAuthRequest = async (req, res, method, endpoint) => {
  try {
    console.log(`🔍 DEBUG - AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
    console.log(`🔍 DEBUG - method: ${method}`);
    console.log(`🔍 DEBUG - endpoint: ${endpoint}`);    console.log(`🔍 DEBUG - req.originalUrl: ${req.originalUrl}`);
    console.log(`🔍 DEBUG - req.url: ${req.url}`);
      const targetUrl = `${AUTH_SERVICE_URL}/api${endpoint}`;
    console.log(`🔍 DEBUG - CONSTRUCTED URL: ${targetUrl}`);
    
    const config = {
      method: method,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
    };

    // Add authorization header if present (for logout, refresh, etc.)
    if (req.headers.authorization) {
      config.headers['Authorization'] = req.headers.authorization;
    }

    // Add body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      config.data = req.body;
    }

    console.log(`🔐 AUTH PROXY: ${method} ${endpoint} -> ${config.url}`);

    const response = await axios(config);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error(`🚨 AUTH PROXY ERROR: ${method} ${endpoint}`, error.message);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      res.status(503).json({
        error: 'Authentication Service Unavailable',
        message: 'Authentication service is not responding',
        service: 'auth',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Authentication Proxy Error',
        message: 'Failed to process authentication request',
        details: error.message
      });
    }
  }
};

// ================================
// 🔑 AUTHENTICATION ENDPOINTS
// ================================

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  console.log('📝 New user registration attempt');
  await proxyAuthRequest(req, res, 'POST', '/register');
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  console.log(`🔑 Login attempt for email: ${req.body.email}`);
  await proxyAuthRequest(req, res, 'POST', '/login');
});

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  console.log('🚪 User logout');
  await proxyAuthRequest(req, res, 'POST', '/logout');
});

// POST /api/auth/forgot-password - Password reset request
router.post('/forgot-password', async (req, res) => {
  console.log(`🔄 Password reset request for: ${req.body.email}`);
  await proxyAuthRequest(req, res, 'POST', '/forgot-password');
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  console.log('🔄 Password reset with token');
  await proxyAuthRequest(req, res, 'POST', '/reset-password');
});

// GET /api/auth/verify-token - Verify JWT token
router.get('/verify-token', async (req, res) => {
  await proxyAuthRequest(req, res, 'GET', '/verify-token');
});

// POST /api/auth/refresh-token - Refresh JWT token
router.post('/refresh-token', async (req, res) => {
  console.log('🔄 Token refresh request');
  await proxyAuthRequest(req, res, 'POST', '/refresh-token');
});

// PUT /api/auth/update-password - Update password (authenticated)
router.put('/update-password', async (req, res) => {
  console.log('🔄 Password update request');
  await proxyAuthRequest(req, res, 'PUT', '/update-password');
});

// GET /api/auth/profile - Get user profile (authenticated)
router.get('/profile', async (req, res) => {
  await proxyAuthRequest(req, res, 'GET', '/profile');
});

// PUT /api/auth/profile - Update user profile (authenticated)
router.put('/profile', async (req, res) => {
  console.log('👤 Profile update request');
  await proxyAuthRequest(req, res, 'PUT', '/profile');
});

module.exports = router;
