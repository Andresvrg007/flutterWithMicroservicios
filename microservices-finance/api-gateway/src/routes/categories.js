// 📂 CATEGORY ROUTES - PROXY TO LEGACY BACKEND
// Maneja categorías de transacciones

const express = require('express');
const axios = require('axios');
const router = express.Router();

const LEGACY_BACKEND_URL = process.env.LEGACY_BACKEND_URL || 'http://legacy-backend:3000';

// Helper function to proxy category requests
const proxyCategoryRequest = async (req, res, method, endpoint) => {
  try {
    console.log(`🔍 DEBUG - LEGACY_BACKEND_URL: ${LEGACY_BACKEND_URL}`);
    console.log(`🔍 DEBUG - method: ${method}`);
    console.log(`🔍 DEBUG - endpoint: ${endpoint}`);
    console.log(`🔍 DEBUG - req.originalUrl: ${req.originalUrl}`);
    console.log(`🔍 DEBUG - req.url: ${req.url}`);
    
    const targetUrl = `${LEGACY_BACKEND_URL}/api${endpoint}`;
    console.log(`🔍 DEBUG - CONSTRUCTED URL: ${targetUrl}`);
    
    const config = {
      method: method,
      url: targetUrl,
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

    console.log(`📂 CATEGORY PROXY: ${method} ${endpoint} -> ${config.url}`);

    const response = await axios(config);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error(`🚨 CATEGORY PROXY ERROR: ${method} ${endpoint}`, error.message);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      res.status(503).json({
        error: 'Category Service Unavailable',
        message: 'Category service is not responding',
        service: 'categories',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Category Proxy Error',
        message: 'Failed to process category request',
        details: error.message
      });
    }
  }
};

// ================================
// 📂 CATEGORY ENDPOINTS
// ================================

// GET /api/categories - Get all categories (with optional type filter)
router.get('/', async (req, res) => {
  console.log('📂 Get categories request');
  await proxyCategoryRequest(req, res, 'GET', '/categories');
});

// GET /api/categories/stats - Get category statistics
router.get('/stats', async (req, res) => {
  console.log('📊 Get category statistics request');
  await proxyCategoryRequest(req, res, 'GET', '/categories/stats');
});

// GET /api/categories/:id - Get category by ID
router.get('/:id', async (req, res) => {
  console.log(`📂 Get category by ID: ${req.params.id}`);
  await proxyCategoryRequest(req, res, 'GET', `/categories/${req.params.id}`);
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  console.log('📂 Create new category');
  await proxyCategoryRequest(req, res, 'POST', '/categories');
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  console.log(`📂 Update category: ${req.params.id}`);
  await proxyCategoryRequest(req, res, 'PUT', `/categories/${req.params.id}`);
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  console.log(`📂 Delete category: ${req.params.id}`);
  await proxyCategoryRequest(req, res, 'DELETE', `/categories/${req.params.id}`);
});

module.exports = router;
