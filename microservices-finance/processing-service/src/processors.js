const Bull = require('bull');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

require('dotenv').config();

// Initialize queues
const pdfQueue = new Bull('pdf generation', process.env.REDIS_URL);
const calculationQueue = new Bull('financial calculations', process.env.REDIS_URL);
const reportQueue = new Bull('report generation', process.env.REDIS_URL);

const MAX_WORKERS = parseInt(process.env.MAX_WORKERS) || 4;
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY) || 5;

// PDF Generation Processor
pdfQueue.process('generate-pdf', QUEUE_CONCURRENCY, async (job) => {
  const { type, data, options, userId } = job.data;
  
  job.progress(10);
    return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'workers/pdf-worker.js'), {
      workerData: { type, data, options, userId }
    });
    
    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });
    
    worker.on('error', reject);
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    
    // Update progress
    const progressInterval = setInterval(() => {
      job.progress(Math.min(90, job.progress() + 10));
    }, 2000);
    
    worker.on('message', () => {
      clearInterval(progressInterval);
      job.progress(100);
    });
  });
});

// Financial Calculations Processor
calculationQueue.process('portfolio-analysis', QUEUE_CONCURRENCY, async (job) => {
  const { transactions, settings, userId } = job.data;
  
  job.progress(10);
    return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'workers/calculation-worker.js'), {
      workerData: { 
        operation: 'portfolio-analysis',
        transactions, 
        settings, 
        userId 
      }
    });
    
    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });
    
    worker.on('error', reject);
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    
    // Update progress
    const progressInterval = setInterval(() => {
      job.progress(Math.min(90, job.progress() + 15));
    }, 1000);
    
    worker.on('message', () => {
      clearInterval(progressInterval);
      job.progress(100);
    });
  });
});

calculationQueue.process('bulk-calculations', QUEUE_CONCURRENCY, async (job) => {
  const { operations, userId } = job.data;
  
  job.progress(5);
  
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'workers/calculation-worker.js'), {
      workerData: { 
        operation: 'bulk-calculations',
        operations, 
        userId 
      }
    });
    
    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });
    
    worker.on('error', reject);
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    
    // Update progress
    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(95, currentProgress + 5);
      job.progress(currentProgress);
    }, 2000);
    
    worker.on('message', () => {
      clearInterval(progressInterval);
      job.progress(100);
    });
  });
});

// Transaction Analysis Processor (NEW)
calculationQueue.process('transaction-analysis', QUEUE_CONCURRENCY, async (job) => {
  const { userId, transactionId, transactionData } = job.data;
  
  job.progress(10);
  console.log(`🔍 Processing transaction analysis for transaction ${transactionId}`);
  
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'workers/transaction-worker.js'), {
      workerData: { 
        userId,
        transactionId,
        transactionData,
        timestamp: new Date()
      }
    });
    
    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });
    
    worker.on('error', reject);
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    
    // Update progress
    let currentProgress = 10;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(90, currentProgress + 20);
      job.progress(currentProgress);
    }, 1000);
    
    worker.on('message', () => {
      clearInterval(progressInterval);
      job.progress(100);
    });
  });
});

// Report Generation Processor
reportQueue.process('generate-report', QUEUE_CONCURRENCY, async (job) => {
  const { reportType, dateRange, filters, format, userId } = job.data;
  
  job.progress(10);
  
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'report-worker.js'), {
      workerData: { 
        reportType, 
        dateRange, 
        filters, 
        format, 
        userId 
      }
    });
    
    worker.on('message', (result) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        resolve(result);
      }
    });
    
    worker.on('error', reject);
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    
    // Update progress
    const progressInterval = setInterval(() => {
      job.progress(Math.min(90, job.progress() + 10));
    }, 3000);
    
    worker.on('message', () => {
      clearInterval(progressInterval);
      job.progress(100);
    });
  });
});

// Event listeners
pdfQueue.on('completed', (job, result) => {
  console.log(`PDF job ${job.id} completed`);
});

pdfQueue.on('failed', (job, err) => {
  console.error(`PDF job ${job.id} failed:`, err.message);
});

calculationQueue.on('completed', (job, result) => {
  console.log(`Calculation job ${job.id} completed`);
});

calculationQueue.on('failed', (job, err) => {
  console.error(`Calculation job ${job.id} failed:`, err.message);
});

reportQueue.on('completed', (job, result) => {
  console.log(`Report job ${job.id} completed`);
});

reportQueue.on('failed', (job, err) => {
  console.error(`Report job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Worker processor shutting down gracefully');
  await Promise.all([
    pdfQueue.close(),
    calculationQueue.close(),
    reportQueue.close()
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Worker processor shutting down gracefully');
  await Promise.all([
    pdfQueue.close(),
    calculationQueue.close(),
    reportQueue.close()
  ]);
  process.exit(0);
});

console.log('Worker processors initialized');
