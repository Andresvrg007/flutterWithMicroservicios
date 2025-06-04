// ⚡ PROCESSING ROUTES - HEAVY COMPUTATIONAL TASKS
// Rutea tareas de procesamiento intensivo al servicio especializado

const express = require('express');
const axios = require('axios');
const router = express.Router();

const PROCESSING_SERVICE_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:8081';

// Helper function to proxy processing requests
const proxyProcessingRequest = async (req, res, method, endpoint) => {
  try {
    const config = {
      method: method,
      url: `${PROCESSING_SERVICE_URL}/api${endpoint}`,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes for heavy processing
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      config.data = req.body;
    }

    // Add query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      config.params = req.query;
    }

    console.log(`⚡ PROCESSING PROXY: ${method} ${endpoint} -> ${config.url}`);

    const response = await axios(config);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error(`🚨 PROCESSING PROXY ERROR: ${method} ${endpoint}`, error.message);

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      res.status(503).json({
        error: 'Processing Service Unavailable',
        message: 'Processing service is not responding',
        service: 'processing',
        timestamp: new Date().toISOString(),
        suggestion: 'Please try again later or check service status'
      });
    } else {
      res.status(500).json({
        error: 'Processing Proxy Error',
        message: 'Failed to process computational request',
        details: error.message
      });
    }
  }
};

// ================================
// 📊 PDF REPORT PROCESSING
// ================================

// POST /api/processing/pdf/generate - Generate PDF report
router.post('/pdf/generate', async (req, res) => {
  console.log('📄 PDF generation request received');
  await proxyProcessingRequest(req, res, 'POST', '/pdf/generate');
});

// GET /api/processing/pdf/status/:taskId - Check PDF generation status
router.get('/pdf/status/:taskId', async (req, res) => {
  await proxyProcessingRequest(req, res, 'GET', `/pdf/status/${req.params.taskId}`);
});

// GET /api/processing/pdf/download/:taskId - Download generated PDF
router.get('/pdf/download/:taskId', async (req, res) => {
  await proxyProcessingRequest(req, res, 'GET', `/pdf/download/${req.params.taskId}`);
});

// ================================
// 🧮 FINANCIAL CALCULATIONS
// ================================

// POST /api/processing/calculate/statistics - Calculate financial statistics
router.post('/calculate/statistics', async (req, res) => {
  console.log('📊 Financial statistics calculation request');
  await proxyProcessingRequest(req, res, 'POST', '/calculate/statistics');
});

// POST /api/processing/calculate/forecast - Financial forecasting
router.post('/calculate/forecast', async (req, res) => {
  console.log('🔮 Financial forecast calculation request');
  await proxyProcessingRequest(req, res, 'POST', '/calculate/forecast');
});

// POST /api/processing/calculate/budget - Budget analysis
router.post('/calculate/budget', async (req, res) => {
  console.log('💰 Budget analysis request');
  await proxyProcessingRequest(req, res, 'POST', '/calculate/budget');
});

// ================================
// 🔄 BULK OPERATIONS
// ================================

// POST /api/processing/bulk/import - Bulk import transactions
router.post('/bulk/import', async (req, res) => {
  console.log('📤 Bulk import request');
  await proxyProcessingRequest(req, res, 'POST', '/bulk/import');
});

// POST /api/processing/bulk/export - Bulk export data
router.post('/bulk/export', async (req, res) => {
  console.log('📥 Bulk export request');
  await proxyProcessingRequest(req, res, 'POST', '/bulk/export');
});

// POST /api/processing/bulk/validate - Bulk data validation
router.post('/bulk/validate', async (req, res) => {
  console.log('✅ Bulk validation request');
  await proxyProcessingRequest(req, res, 'POST', '/bulk/validate');
});

// ================================
// 📈 ADVANCED ANALYTICS
// ================================

// POST /api/processing/analytics/trends - Analyze spending trends
router.post('/analytics/trends', async (req, res) => {
  console.log('📈 Trend analysis request');
  await proxyProcessingRequest(req, res, 'POST', '/analytics/trends');
});

// POST /api/processing/analytics/patterns - Detect spending patterns
router.post('/analytics/patterns', async (req, res) => {
  console.log('🔍 Pattern detection request');
  await proxyProcessingRequest(req, res, 'POST', '/analytics/patterns');
});

// POST /api/processing/analytics/recommendations - Generate recommendations
router.post('/analytics/recommendations', async (req, res) => {
  console.log('💡 Recommendation generation request');
  await proxyProcessingRequest(req, res, 'POST', '/analytics/recommendations');
});

// ================================
// 🔧 PROCESSING SYSTEM STATUS
// ================================

// GET /api/processing/health - Processing service health
router.get('/health', async (req, res) => {
  await proxyProcessingRequest(req, res, 'GET', '/health');
});

// GET /api/processing/stats - Processing service statistics
router.get('/stats', async (req, res) => {
  await proxyProcessingRequest(req, res, 'GET', '/stats');
});

// GET /api/processing/workers - Active worker information
router.get('/workers', async (req, res) => {
  await proxyProcessingRequest(req, res, 'GET', '/workers');
});

module.exports = router;
