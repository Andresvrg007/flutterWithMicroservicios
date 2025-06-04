const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Bull = require('bull');
const Redis = require('redis');
const mongoose = require('mongoose');
const { promisify } = require('util');
const client = require('prom-client');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;
const METRICS_PORT = process.env.METRICS_PORT || 3004;

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const processingJobsTotal = new client.Counter({
  name: 'processing_jobs_total',
  help: 'Total number of processing jobs',
  labelNames: ['job_type', 'status']
});

const activeWorkers = new client.Gauge({
  name: 'active_workers',
  help: 'Number of active worker threads'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(processingJobsTotal);
register.registerMetric(activeWorkers);

// Redis connection
const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Job queues
const pdfQueue = new Bull('pdf generation', process.env.REDIS_URL);
const calculationQueue = new Bull('financial calculations', process.env.REDIS_URL);
const reportQueue = new Bull('report generation', process.env.REDIS_URL);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'processing-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    queues: {
      pdf: pdfQueue.name,
      calculation: calculationQueue.name,
      report: reportQueue.name
    }
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// PDF Generation Routes
app.post('/api/pdf/generate', authenticateToken, async (req, res) => {
  try {
    const { type, data, options = {} } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }

    const job = await pdfQueue.add('generate-pdf', {
      type,
      data,
      options,
      userId: req.user.id,
      timestamp: new Date()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      timeout: process.env.PDF_TIMEOUT || 30000
    });

    processingJobsTotal.labels('pdf', 'created').inc();

    res.json({
      jobId: job.id,
      status: 'queued',
      message: 'PDF generation job created'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    processingJobsTotal.labels('pdf', 'failed').inc();
    res.status(500).json({ error: 'Failed to create PDF generation job' });
  }
});

app.get('/api/pdf/status/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await pdfQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();
    
    let result = null;
    if (state === 'completed') {
      result = job.returnvalue;
    }

    res.json({
      jobId: job.id,
      status: state,
      progress,
      result,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Financial Calculations Routes
app.post('/api/calculations/portfolio', authenticateToken, async (req, res) => {
  try {
    const { transactions, settings = {} } = req.body;
    
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions array is required' });
    }

    const job = await calculationQueue.add('portfolio-analysis', {
      transactions,
      settings,
      userId: req.user.id,
      timestamp: new Date()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      timeout: 60000
    });

    processingJobsTotal.labels('calculation', 'created').inc();

    res.json({
      jobId: job.id,
      status: 'queued',
      message: 'Portfolio analysis job created'
    });
  } catch (error) {
    console.error('Portfolio calculation error:', error);
    processingJobsTotal.labels('calculation', 'failed').inc();
    res.status(500).json({ error: 'Failed to create portfolio analysis job' });
  }
});

app.post('/api/calculations/bulk', authenticateToken, async (req, res) => {
  try {
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ error: 'Operations array is required' });
    }

    const job = await calculationQueue.add('bulk-calculations', {
      operations,
      userId: req.user.id,
      timestamp: new Date()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      timeout: 120000
    });

    processingJobsTotal.labels('calculation', 'created').inc();

    res.json({
      jobId: job.id,
      status: 'queued',
      message: 'Bulk calculations job created'
    });
  } catch (error) {
    console.error('Bulk calculation error:', error);
    processingJobsTotal.labels('calculation', 'failed').inc();
    res.status(500).json({ error: 'Failed to create bulk calculations job' });
  }
});

// Report Generation Routes
app.post('/api/reports/generate', authenticateToken, async (req, res) => {
  try {
    const { reportType, dateRange, filters = {}, format = 'pdf' } = req.body;
    
    if (!reportType || !dateRange) {
      return res.status(400).json({ error: 'Report type and date range are required' });
    }

    const job = await reportQueue.add('generate-report', {
      reportType,
      dateRange,
      filters,
      format,
      userId: req.user.id,
      timestamp: new Date()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      timeout: 90000
    });

    processingJobsTotal.labels('report', 'created').inc();

    res.json({
      jobId: job.id,
      status: 'queued',
      message: 'Report generation job created'
    });
  } catch (error) {
    console.error('Report generation error:', error);
    processingJobsTotal.labels('report', 'failed').inc();
    res.status(500).json({ error: 'Failed to create report generation job' });
  }
});

// Job Status Route (Generic)
app.get('/api/jobs/:jobId/status', authenticateToken, async (req, res) => {
  try {
    const jobId = req.params.jobId;
    let job = null;

    // Try to find the job in all queues
    job = await pdfQueue.getJob(jobId) || 
          await calculationQueue.getJob(jobId) || 
          await reportQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();
    
    let result = null;
    let error = null;
    
    if (state === 'completed') {
      result = job.returnvalue;
    } else if (state === 'failed') {
      error = job.failedReason;
    }

    res.json({
      jobId: job.id,
      status: state,
      progress,
      result,
      error,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Queue Statistics
app.get('/api/queues/stats', authenticateToken, async (req, res) => {
  try {
    const [pdfStats, calcStats, reportStats] = await Promise.all([
      pdfQueue.getJobCounts(),
      calculationQueue.getJobCounts(),
      reportQueue.getJobCounts()
    ]);

    res.json({
      pdf: pdfStats,
      calculations: calcStats,
      reports: reportStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Processing service error:', error);
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await Promise.all([
    pdfQueue.close(),
    calculationQueue.close(),
    reportQueue.close(),
    redis.quit()
  ]);
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  await Promise.all([
    pdfQueue.close(),
    calculationQueue.close(),
    reportQueue.close(),
    redis.quit()
  ]);
  
  process.exit(0);
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_processing', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Processing service running on port ${PORT}`);
});

// Start metrics server
const metricsServer = express();
metricsServer.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

metricsServer.listen(METRICS_PORT, () => {
  console.log(`Metrics server running on port ${METRICS_PORT}`);
});

module.exports = app;
