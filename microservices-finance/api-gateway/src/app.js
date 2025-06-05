// Punto de entrada único para toda la arquitectura de microservicios
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import custom middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const transactionRoutes = require('./routes/transactions');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const processingRoutes = require('./routes/processing');
const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 8080;

// ================================
// 🛡️ SECURITY & MIDDLEWARE SETUP
// ================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:*"],
    },
  },
}));

// CORS configuration for Flutter app
app.use(cors({
  origin: ['http://localhost:*', 'http://10.0.2.2:*'], // Android emulator
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression for better performance
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom request logging
app.use(requestLogger);

// Morgan for HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ================================
// 📡 API ROUTES CONFIGURATION
// ================================

// Health check (no auth required)
app.use('/health', healthRoutes);

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/processing', authMiddleware, processingRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// ================================
// 🏠 WELCOME & INFO ENDPOINTS
// ================================

app.get('/', (req, res) => {
  res.json({
    service: 'Finance API Gateway',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    timestamp: new Date().toISOString(),    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      transactions: '/api/transactions/*',
      categories: '/api/categories/*',
      processing: '/api/processing/*',
      notifications: '/api/notifications/*'
    },
    documentation: 'https://github.com/your-repo/finance-microservices',
    microservices: {
      legacy_backend: process.env.LEGACY_BACKEND_URL || 'http://localhost:3000',
      processing_service: process.env.PROCESSING_SERVICE_URL || 'http://localhost:8081',
      notification_service: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8082'
    }
  });
});

// ================================
// ❌ ERROR HANDLING
// ================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: ['/health', '/api/auth', '/api/transactions', '/api/categories', '/api/processing', '/api/notifications']
  });
});

// Global error handler
app.use(errorHandler);

// ================================
// 🚀 SERVER STARTUP
// ================================

const server = app.listen(PORT, () => {
  console.log('\n🚀 ===================================');
  console.log('   FINANCE API GATEWAY STARTED');
  console.log('=====================================');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Enabled: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
  console.log(`📊 Rate Limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/15min`);
  console.log('\n🔗 Connected Services:');
  console.log(`   Legacy Backend: ${process.env.LEGACY_BACKEND_URL || 'http://localhost:3000'}`);
  console.log(`   Processing: ${process.env.PROCESSING_SERVICE_URL || 'http://localhost:8081'}`);
  console.log(`   Notifications: ${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8082'}`);
  console.log('\n📱 Ready for Flutter connections!');
  console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed. Process terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed. Process terminated.');
    process.exit(0);
  });
});

module.exports = app;
