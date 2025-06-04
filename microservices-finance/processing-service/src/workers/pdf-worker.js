const { parentPort, workerData } = require('worker_threads');
const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

// PDF Generation Worker
async function generatePDF() {
  try {
    const { type, data, options, userId } = workerData;
    
    let pdfBuffer;
    
    switch (type) {
      case 'transaction-statement':
        pdfBuffer = await generateTransactionStatement(data, options);
        break;
      case 'portfolio-report':
        pdfBuffer = await generatePortfolioReport(data, options);
        break;
      case 'financial-summary':
        pdfBuffer = await generateFinancialSummary(data, options);
        break;
      case 'tax-report':
        pdfBuffer = await generateTaxReport(data, options);
        break;
      default:
        throw new Error(`Unknown PDF type: ${type}`);
    }
    
    // Save PDF to temporary location
    const filename = `${type}-${userId}-${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../temp', filename);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, pdfBuffer);
    
    parentPort.postMessage({
      success: true,
      filename,
      filepath,
      size: pdfBuffer.length,
      type,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    parentPort.postMessage({
      error: error.message,
      stack: error.stack
    });
  }
}

async function generateTransactionStatement(data, options) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).text('Transaction Statement', 50, 50);
      doc.fontSize(12).text(`Generated: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 80);
      
      if (data.dateRange) {
        doc.text(`Period: ${moment(data.dateRange.start).format('MMM DD, YYYY')} - ${moment(data.dateRange.end).format('MMM DD, YYYY')}`, 50, 100);
      }
      
      let yPosition = 140;
      
      // Summary
      if (data.summary) {
        doc.fontSize(16).text('Summary', 50, yPosition);
        yPosition += 30;
        
        doc.fontSize(12)
           .text(`Total Transactions: ${data.summary.totalTransactions || 0}`, 50, yPosition)
           .text(`Total Income: $${(data.summary.totalIncome || 0).toFixed(2)}`, 50, yPosition + 20)
           .text(`Total Expenses: $${(data.summary.totalExpenses || 0).toFixed(2)}`, 50, yPosition + 40)
           .text(`Net Amount: $${((data.summary.totalIncome || 0) - (data.summary.totalExpenses || 0)).toFixed(2)}`, 50, yPosition + 60);
        
        yPosition += 100;
      }
      
      // Transactions Table
      if (data.transactions && data.transactions.length > 0) {
        doc.fontSize(16).text('Transactions', 50, yPosition);
        yPosition += 30;
        
        // Table headers
        doc.fontSize(10)
           .text('Date', 50, yPosition)
           .text('Description', 120, yPosition)
           .text('Category', 300, yPosition)
           .text('Amount', 450, yPosition);
        
        yPosition += 20;
        
        // Draw line under headers
        doc.moveTo(50, yPosition)
           .lineTo(550, yPosition)
           .stroke();
        
        yPosition += 10;
        
        // Transaction rows
        data.transactions.forEach((transaction, index) => {
          if (yPosition > 720) { // New page if needed
            doc.addPage();
            yPosition = 50;
          }
          
          const amount = transaction.amount || 0;
          const amountColor = amount >= 0 ? 'green' : 'red';
          
          doc.fontSize(9)
             .fillColor('black')
             .text(moment(transaction.date).format('MM/DD/YYYY'), 50, yPosition)
             .text(transaction.description || 'N/A', 120, yPosition, { width: 170 })
             .text(transaction.category || 'Uncategorized', 300, yPosition, { width: 140 })
             .fillColor(amountColor)
             .text(`$${amount.toFixed(2)}`, 450, yPosition);
          
          yPosition += 20;
        });
      }
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

async function generatePortfolioReport(data, options) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).text('Portfolio Report', 50, 50);
      doc.fontSize(12).text(`Generated: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 80);
      
      let yPosition = 120;
      
      // Portfolio Summary
      if (data.summary) {
        doc.fontSize(16).text('Portfolio Summary', 50, yPosition);
        yPosition += 30;
        
        doc.fontSize(12)
           .text(`Total Value: $${(data.summary.totalValue || 0).toLocaleString()}`, 50, yPosition)
           .text(`Total Gain/Loss: $${(data.summary.totalGainLoss || 0).toLocaleString()}`, 50, yPosition + 20)
           .text(`Return: ${((data.summary.totalReturn || 0) * 100).toFixed(2)}%`, 50, yPosition + 40);
        
        yPosition += 80;
      }
      
      // Asset Allocation Chart
      if (data.assetAllocation && data.assetAllocation.length > 0) {
        doc.fontSize(16).text('Asset Allocation', 50, yPosition);
        yPosition += 30;
        
        // Generate pie chart
        const chartCanvas = new ChartJSNodeCanvas({ width: 400, height: 300 });
        const chartBuffer = await chartCanvas.renderToBuffer({
          type: 'pie',
          data: {
            labels: data.assetAllocation.map(item => item.category),
            datasets: [{
              data: data.assetAllocation.map(item => item.percentage),
              backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
              ]
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'right'
              }
            }
          }
        });
        
        doc.image(chartBuffer, 50, yPosition, { width: 400 });
        yPosition += 320;
      }
      
      // Holdings Table
      if (data.holdings && data.holdings.length > 0) {
        if (yPosition > 600) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(16).text('Holdings', 50, yPosition);
        yPosition += 30;
        
        // Table headers
        doc.fontSize(10)
           .text('Symbol', 50, yPosition)
           .text('Name', 120, yPosition)
           .text('Shares', 280, yPosition)
           .text('Price', 350, yPosition)
           .text('Value', 420, yPosition)
           .text('Gain/Loss', 480, yPosition);
        
        yPosition += 20;
        
        // Draw line under headers
        doc.moveTo(50, yPosition)
           .lineTo(550, yPosition)
           .stroke();
        
        yPosition += 10;
        
        // Holdings rows
        data.holdings.forEach((holding) => {
          if (yPosition > 720) {
            doc.addPage();
            yPosition = 50;
          }
          
          const gainLoss = holding.gainLoss || 0;
          const gainLossColor = gainLoss >= 0 ? 'green' : 'red';
          
          doc.fontSize(9)
             .fillColor('black')
             .text(holding.symbol || 'N/A', 50, yPosition)
             .text(holding.name || 'N/A', 120, yPosition, { width: 150 })
             .text((holding.shares || 0).toString(), 280, yPosition)
             .text(`$${(holding.price || 0).toFixed(2)}`, 350, yPosition)
             .text(`$${(holding.value || 0).toLocaleString()}`, 420, yPosition)
             .fillColor(gainLossColor)
             .text(`$${gainLoss.toFixed(2)}`, 480, yPosition);
          
          yPosition += 20;
        });
      }
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

async function generateFinancialSummary(data, options) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).text('Financial Summary', 50, 50);
      doc.fontSize(12).text(`Generated: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 80);
      
      if (data.period) {
        doc.text(`Period: ${data.period}`, 50, 100);
      }
      
      let yPosition = 140;
      
      // Key Metrics
      if (data.metrics) {
        doc.fontSize(16).text('Key Metrics', 50, yPosition);
        yPosition += 30;
        
        const metrics = [
          { label: 'Total Income', value: `$${(data.metrics.totalIncome || 0).toLocaleString()}` },
          { label: 'Total Expenses', value: `$${(data.metrics.totalExpenses || 0).toLocaleString()}` },
          { label: 'Net Income', value: `$${(data.metrics.netIncome || 0).toLocaleString()}` },
          { label: 'Savings Rate', value: `${((data.metrics.savingsRate || 0) * 100).toFixed(1)}%` },
          { label: 'Investment Return', value: `${((data.metrics.investmentReturn || 0) * 100).toFixed(2)}%` }
        ];
        
        metrics.forEach((metric, index) => {
          doc.fontSize(12)
             .text(`${metric.label}: ${metric.value}`, 50, yPosition + (index * 25));
        });
        
        yPosition += 150;
      }
      
      // Monthly Trend Chart
      if (data.monthlyTrend && data.monthlyTrend.length > 0) {
        doc.fontSize(16).text('Monthly Trend', 50, yPosition);
        yPosition += 30;
        
        const chartCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });
        const chartBuffer = await chartCanvas.renderToBuffer({
          type: 'line',
          data: {
            labels: data.monthlyTrend.map(item => moment(item.month).format('MMM YYYY')),
            datasets: [
              {
                label: 'Income',
                data: data.monthlyTrend.map(item => item.income),
                borderColor: '#36A2EB',
                backgroundColor: '#36A2EB',
                fill: false
              },
              {
                label: 'Expenses',
                data: data.monthlyTrend.map(item => item.expenses),
                borderColor: '#FF6384',
                backgroundColor: '#FF6384',
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return '$' + value.toLocaleString();
                  }
                }
              }
            }
          }
        });
        
        doc.image(chartBuffer, 50, yPosition, { width: 450 });
        yPosition += 320;
      }
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

async function generateTaxReport(data, options) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).text('Tax Report', 50, 50);
      doc.fontSize(12).text(`Tax Year: ${data.taxYear || new Date().getFullYear()}`, 50, 80);
      doc.text(`Generated: ${moment().format('MMMM Do YYYY, h:mm:ss a')}`, 50, 100);
      
      let yPosition = 140;
      
      // Tax Summary
      if (data.taxSummary) {
        doc.fontSize(16).text('Tax Summary', 50, yPosition);
        yPosition += 30;
        
        doc.fontSize(12)
           .text(`Taxable Income: $${(data.taxSummary.taxableIncome || 0).toLocaleString()}`, 50, yPosition)
           .text(`Tax Deductions: $${(data.taxSummary.deductions || 0).toLocaleString()}`, 50, yPosition + 20)
           .text(`Capital Gains: $${(data.taxSummary.capitalGains || 0).toLocaleString()}`, 50, yPosition + 40)
           .text(`Capital Losses: $${(data.taxSummary.capitalLosses || 0).toLocaleString()}`, 50, yPosition + 60)
           .text(`Estimated Tax: $${(data.taxSummary.estimatedTax || 0).toLocaleString()}`, 50, yPosition + 80);
        
        yPosition += 120;
      }
      
      // Tax Documents
      if (data.taxDocuments && data.taxDocuments.length > 0) {
        doc.fontSize(16).text('Tax Documents', 50, yPosition);
        yPosition += 30;
        
        data.taxDocuments.forEach((document, index) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          doc.fontSize(12)
             .text(`${document.type || 'Unknown'}: ${document.description || 'N/A'}`, 50, yPosition)
             .text(`Amount: $${(document.amount || 0).toLocaleString()}`, 300, yPosition);
          
          yPosition += 25;
        });
      }
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Start the worker
generatePDF();
