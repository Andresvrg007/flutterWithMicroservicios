const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');

// Transaction Analysis Worker
async function performTransactionAnalysis() {
  try {
    const { userId, transactionId, transactionData, timestamp } = workerData;
    
    console.log(`\n🔍 ===== TRANSACTION ANALYSIS SIMULATION =====`);
    console.log(`🆔 Transaction ID: ${transactionId}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`💰 Amount: $${transactionData.amount}`);
    console.log(`📊 Type: ${transactionData.type}`);
    console.log(`🏷️  Category: ${transactionData.category}`);
    console.log(`📝 Description: ${transactionData.description}`);
    console.log(`📅 Date: ${new Date(transactionData.date).toLocaleDateString()}`);
    console.log(`⏰ Processing Time: ${new Date(timestamp).toISOString()}`);
    
    // Simulate intensive processing work (CPU intensive)
    console.log(`🔄 Performing complex financial analysis...`);
    let analysisResult = 0;
    for (let i = 0; i < 1000000; i++) {
      analysisResult += Math.sqrt(i) * Math.random();
    }
    
    // Simulate different types of analysis based on transaction data
    const analysis = {
      transactionId,
      userId,
      analysisType: 'financial_impact',
      results: {},
      recommendations: [],
      alerts: [],
      processingTime: new Date() - new Date(timestamp)
    };
    
    // Category-based analysis
    if (transactionData.category) {
      console.log(`📈 Analyzing category spending patterns...`);
      analysis.results.categoryAnalysis = {
        category: transactionData.category,
        isFrequentCategory: Math.random() > 0.3,
        averageAmount: transactionData.amount * (0.8 + Math.random() * 0.4),
        suggestion: `Consider budgeting for ${transactionData.category} expenses`
      };
    }
    
    // Amount-based analysis
    const isLargeTransaction = transactionData.amount > 100;
    if (isLargeTransaction) {
      console.log(`💸 Large transaction detected, analyzing impact...`);
      analysis.alerts.push({
        type: 'large_transaction',
        message: `Large ${transactionData.type} of $${transactionData.amount} detected`,
        severity: transactionData.amount > 500 ? 'high' : 'medium'
      });
    }
    
    // Budget impact analysis
    console.log(`📊 Calculating budget impact...`);
    analysis.results.budgetImpact = {
      monthlyBudgetUsed: Math.random() * 100,
      projectedMonthlySpend: transactionData.amount * (20 + Math.random() * 10),
      isOverBudget: Math.random() > 0.7
    };
    
    // Fraud detection simulation
    console.log(`🔍 Running fraud detection algorithms...`);
    const isSuspicious = Math.random() > 0.95; // 5% chance of suspicious activity
    if (isSuspicious) {
      analysis.alerts.push({
        type: 'fraud_alert',
        message: 'Unusual transaction pattern detected',
        severity: 'high',
        actions: ['verify_transaction', 'contact_user']
      });
    }
    
    // Generate recommendations
    if (transactionData.type === 'gasto') {
      analysis.recommendations.push({
        type: 'saving_tip',
        message: `Consider setting aside ${(transactionData.amount * 0.1).toFixed(2)} for savings`,
        category: 'financial_wellness'
      });
    } else {
      analysis.recommendations.push({
        type: 'investment_tip',
        message: `Great income! Consider investing ${(transactionData.amount * 0.2).toFixed(2)} for long-term growth`,
        category: 'wealth_building'
      });
    }
    
    // Simulate more processing
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    console.log(`✅ Analysis completed successfully!`);
    console.log(`📊 Results: ${JSON.stringify(analysis.results, null, 2)}`);
    console.log(`⚠️  Alerts: ${analysis.alerts.length} alerts generated`);
    console.log(`💡 Recommendations: ${analysis.recommendations.length} recommendations`);
    console.log(`==========================================\n`);
    
    // Send notification about completed analysis
    const notificationResult = await sendNotificationAfterProcessing(userId, transactionId, analysis);
    
    parentPort.postMessage({
      success: true,
      analysis,
      notificationSent: notificationResult.success,
      completedAt: new Date().toISOString(),
      processingTime: analysis.processingTime
    });
    
  } catch (error) {
    console.error(`❌ Transaction analysis failed:`, error);
    parentPort.postMessage({
      error: error.message,
      stack: error.stack
    });
  }
}

// Send notification after processing is complete
async function sendNotificationAfterProcessing(userId, transactionId, analysis) {
  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
    
    // Determine notification priority based on analysis
    let priority = 'normal';
    const hasHighAlerts = analysis.alerts.some(alert => alert.severity === 'high');
    if (hasHighAlerts) {
      priority = 'high';
    }
    
    // Create notification content
    let title = '📊 Transaction Analysis Complete';
    let message = `Analysis completed for transaction $${analysis.results.budgetImpact?.projectedMonthlySpend || 'N/A'}`;
    
    if (analysis.alerts.length > 0) {
      title = '⚠️ Transaction Analysis - Alerts Found';
      message = `Analysis found ${analysis.alerts.length} alert(s) for your recent transaction.`;
    }
    
    const notificationData = {
      type: 'transactionAlerts',
      title,
      message,
      channels: ['push', 'websocket'],
      recipients: [userId],
      data: {
        transactionId,
        analysisId: `analysis_${transactionId}_${Date.now()}`,
        alertCount: analysis.alerts.length,
        recommendationCount: analysis.recommendations.length,
        processingTime: analysis.processingTime,
        hasAlerts: analysis.alerts.length > 0,
        alerts: analysis.alerts,
        recommendations: analysis.recommendations.slice(0, 2) // Only send top 2 recommendations
      },
      priority
    };
    
    // Generate a simple JWT token for the notification service
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
    
    const response = await axios.post(`${notificationServiceUrl}/api/notifications/send`, notificationData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`✅ Post-processing notification sent: ${response.data.jobId}`);
    return { success: true, jobId: response.data.jobId };
    
  } catch (error) {
    console.error('❌ Failed to send post-processing notification:', error.message);
    return { success: false, error: error.message };
  }
}

// Start the analysis
performTransactionAnalysis();
