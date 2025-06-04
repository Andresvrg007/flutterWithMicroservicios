// 🔗 TRANSACTIONS ROUTES - PROXY TO LEGACY BACKEND
// Rutea las peticiones de transacciones al backend existente

const express = require('express');
const axios = require('axios');
const router = express.Router();

const LEGACY_BACKEND_URL = process.env.LEGACY_BACKEND_URL || 'http://localhost:3000';

// Helper function to proxy requests
const proxyRequest = async (req, res, method, endpoint) => {
  try {
    const config = {
      method: method,
      url: `${LEGACY_BACKEND_URL}/api${endpoint}`,
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

    console.log(`🔄 PROXY: ${method} ${endpoint} -> ${config.url}`);

    const response = await axios(config);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error(`🚨 PROXY ERROR: ${method} ${endpoint}`, error.message);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Legacy backend service is not responding',
        service: 'transactions',
        timestamp: new Date().toISOString()
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        error: 'Proxy Error',
        message: 'Failed to process request',
        details: error.message
      });
    }
  }
};

// ================================
// 📊 TRANSACTION ENDPOINTS
// ================================

// GET /api/transactions - Get all transactions
router.get('/', async (req, res) => {
  await proxyRequest(req, res, 'GET', '/transactions');
});

// GET /api/transactions/:id - Get transaction by ID
router.get('/:id', async (req, res) => {
  await proxyRequest(req, res, 'GET', `/transactions/${req.params.id}`);
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
  await proxyRequest(req, res, 'POST', '/transactions');
});

// PUT /api/transactions/:id - Update transaction
router.put('/:id', async (req, res) => {
  await proxyRequest(req, res, 'PUT', `/transactions/${req.params.id}`);
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
  await proxyRequest(req, res, 'DELETE', `/transactions/${req.params.id}`);
});

// GET /api/transactions/user/:userId - Get transactions by user
router.get('/user/:userId', async (req, res) => {
  await proxyRequest(req, res, 'GET', `/transactions/user/${req.params.userId}`);
});

// ================================
// 📈 ADVANCED TRANSACTION QUERIES
// ================================

// GET /api/transactions/search - Search transactions
router.get('/search', async (req, res) => {
  await proxyRequest(req, res, 'GET', '/transactions/search');
});

// GET /api/transactions/stats/:userId - Get transaction statistics
router.get('/stats/:userId', async (req, res) => {
  await proxyRequest(req, res, 'GET', `/transactions/stats/${req.params.userId}`);
});

// GET /api/transactions/balance/:userId - Get user balance
router.get('/balance/:userId', async (req, res) => {
  await proxyRequest(req, res, 'GET', `/transactions/balance/${req.params.userId}`);
});

module.exports = router;
