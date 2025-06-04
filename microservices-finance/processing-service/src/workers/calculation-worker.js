const { parentPort, workerData } = require('worker_threads');
const _ = require('lodash');
const moment = require('moment');

// Financial Calculations Worker
async function performCalculations() {
  try {
    const { operation, transactions, settings, operations, userId } = workerData;
    
    let result;
    
    switch (operation) {
      case 'portfolio-analysis':
        result = await performPortfolioAnalysis(transactions, settings);
        break;
      case 'bulk-calculations':
        result = await performBulkCalculations(operations);
        break;
      default:
        throw new Error(`Unknown calculation operation: ${operation}`);
    }
    
    parentPort.postMessage({
      success: true,
      result,
      completedAt: new Date().toISOString(),
      operation
    });
    
  } catch (error) {
    parentPort.postMessage({
      error: error.message,
      stack: error.stack
    });
  }
}

async function performPortfolioAnalysis(transactions, settings = {}) {
  const analysis = {
    summary: {},
    performance: {},
    riskMetrics: {},
    assetAllocation: [],
    recommendations: []
  };
  
  // Group transactions by symbol/asset
  const groupedTransactions = _.groupBy(transactions, 'symbol');
  const holdings = {};
  
  // Calculate holdings and positions
  Object.keys(groupedTransactions).forEach(symbol => {
    const symbolTransactions = groupedTransactions[symbol];
    let totalShares = 0;
    let totalCost = 0;
    let averageCost = 0;
    
    symbolTransactions.forEach(transaction => {
      const shares = transaction.shares || 0;
      const price = transaction.price || 0;
      
      if (transaction.type === 'buy') {
        totalShares += shares;
        totalCost += shares * price;
      } else if (transaction.type === 'sell') {
        totalShares -= shares;
        // Adjust cost basis proportionally
        const costReduction = (shares / totalShares) * totalCost;
        totalCost -= costReduction;
      }
    });
    
    if (totalShares > 0) {
      averageCost = totalCost / totalShares;
      
      holdings[symbol] = {
        symbol,
        shares: totalShares,
        averageCost,
        totalCost,
        currentPrice: symbolTransactions[symbolTransactions.length - 1]?.currentPrice || averageCost,
        lastUpdated: new Date()
      };
    }
  });
  
  // Calculate current values and performance
  let totalValue = 0;
  let totalCost = 0;
  let totalGainLoss = 0;
  
  const holdingsArray = Object.values(holdings).map(holding => {
    const currentValue = holding.shares * holding.currentPrice;
    const gainLoss = currentValue - holding.totalCost;
    const gainLossPercent = holding.totalCost > 0 ? (gainLoss / holding.totalCost) * 100 : 0;
    
    totalValue += currentValue;
    totalCost += holding.totalCost;
    totalGainLoss += gainLoss;
    
    return {
      ...holding,
      currentValue,
      gainLoss,
      gainLossPercent
    };
  });
  
  // Portfolio summary
  analysis.summary = {
    totalValue,
    totalCost,
    totalGainLoss,
    totalReturn: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
    holdingsCount: holdingsArray.length
  };
  
  // Performance metrics
  const returns = calculateReturns(transactions);
  analysis.performance = {
    dailyReturns: returns.daily,
    monthlyReturns: returns.monthly,
    yearlyReturn: returns.yearly,
    volatility: calculateVolatility(returns.daily),
    sharpeRatio: calculateSharpeRatio(returns.daily, settings.riskFreeRate || 0.02)
  };
  
  // Risk metrics
  analysis.riskMetrics = {
    portfolioVolatility: analysis.performance.volatility,
    valueAtRisk: calculateVaR(returns.daily, 0.05),
    maxDrawdown: calculateMaxDrawdown(returns.daily),
    beta: calculateBeta(returns.daily, returns.marketReturns || [])
  };
  
  // Asset allocation
  analysis.assetAllocation = calculateAssetAllocation(holdingsArray, totalValue);
  
  // Risk-based recommendations
  analysis.recommendations = generateRecommendations(analysis, settings);
  
  return analysis;
}

async function performBulkCalculations(operations) {
  const results = [];
  
  for (const operation of operations) {
    try {
      let result;
      
      switch (operation.type) {
        case 'compound-interest':
          result = calculateCompoundInterest(operation.params);
          break;
        case 'present-value':
          result = calculatePresentValue(operation.params);
          break;
        case 'future-value':
          result = calculateFutureValue(operation.params);
          break;
        case 'loan-payment':
          result = calculateLoanPayment(operation.params);
          break;
        case 'retirement-planning':
          result = calculateRetirementNeeds(operation.params);
          break;
        case 'tax-optimization':
          result = optimizeTaxStrategy(operation.params);
          break;
        case 'portfolio-optimization':
          result = optimizePortfolio(operation.params);
          break;
        default:
          result = { error: `Unknown calculation type: ${operation.type}` };
      }
      
      results.push({
        id: operation.id,
        type: operation.type,
        result,
        completedAt: new Date().toISOString()
      });
      
    } catch (error) {
      results.push({
        id: operation.id,
        type: operation.type,
        error: error.message,
        completedAt: new Date().toISOString()
      });
    }
  }
  
  return results;
}

// Financial calculation functions
function calculateCompoundInterest({ principal, rate, time, compoundFrequency = 12 }) {
  const amount = principal * Math.pow(1 + rate / compoundFrequency, compoundFrequency * time);
  return {
    principal,
    rate,
    time,
    compoundFrequency,
    finalAmount: amount,
    totalInterest: amount - principal,
    monthlyBreakdown: generateCompoundInterestBreakdown(principal, rate, time, compoundFrequency)
  };
}

function calculatePresentValue({ futureValue, rate, time }) {
  const presentValue = futureValue / Math.pow(1 + rate, time);
  return {
    futureValue,
    rate,
    time,
    presentValue,
    discountAmount: futureValue - presentValue
  };
}

function calculateFutureValue({ presentValue, rate, time }) {
  const futureValue = presentValue * Math.pow(1 + rate, time);
  return {
    presentValue,
    rate,
    time,
    futureValue,
    totalGrowth: futureValue - presentValue
  };
}

function calculateLoanPayment({ principal, rate, term }) {
  const monthlyRate = rate / 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                        (Math.pow(1 + monthlyRate, term) - 1);
  
  return {
    principal,
    rate,
    term,
    monthlyPayment,
    totalPayments: monthlyPayment * term,
    totalInterest: (monthlyPayment * term) - principal,
    amortizationSchedule: generateAmortizationSchedule(principal, rate, term, monthlyPayment)
  };
}

function calculateRetirementNeeds({ currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn, inflationRate, desiredIncome }) {
  const yearsToRetirement = retirementAge - currentAge;
  const yearsInRetirement = 25; // Assume 25 years in retirement
  
  // Future value of current savings
  const futureCurrentSavings = currentSavings * Math.pow(1 + expectedReturn, yearsToRetirement);
  
  // Future value of monthly contributions
  const monthlyReturn = expectedReturn / 12;
  const totalMonths = yearsToRetirement * 12;
  const futureContributions = monthlyContribution * 
    ((Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn);
  
  const totalRetirementSavings = futureCurrentSavings + futureContributions;
  
  // Adjust desired income for inflation
  const inflationAdjustedIncome = desiredIncome * Math.pow(1 + inflationRate, yearsToRetirement);
  
  // Calculate required savings for retirement income
  const requiredSavings = inflationAdjustedIncome * 12 * yearsInRetirement / 
    ((Math.pow(1 + expectedReturn, yearsInRetirement) - 1) / expectedReturn);
  
  return {
    currentAge,
    retirementAge,
    yearsToRetirement,
    totalRetirementSavings,
    requiredSavings,
    shortfall: Math.max(0, requiredSavings - totalRetirementSavings),
    onTrack: totalRetirementSavings >= requiredSavings,
    recommendedMonthlyContribution: totalRetirementSavings < requiredSavings ? 
      calculateRequiredMonthlyContribution(requiredSavings - futureCurrentSavings, expectedReturn, yearsToRetirement) : 
      monthlyContribution
  };
}

function optimizeTaxStrategy({ income, deductions, taxBrackets, investmentAccounts }) {
  const optimizations = [];
  let optimizedTax = calculateTax(income, deductions, taxBrackets);
  
  // 401k optimization
  if (investmentAccounts.has401k) {
    const maxContribution = 22500; // 2023 limit
    const currentContribution = investmentAccounts.current401k || 0;
    const additionalContribution = Math.min(maxContribution - currentContribution, income * 0.1);
    
    if (additionalContribution > 0) {
      const newTax = calculateTax(income - additionalContribution, deductions, taxBrackets);
      optimizations.push({
        strategy: '401k Contribution',
        additionalContribution,
        taxSavings: optimizedTax - newTax,
        netCost: additionalContribution - (optimizedTax - newTax)
      });
    }
  }
  
  // IRA optimization
  const iraLimit = 6000; // 2023 limit
  const currentIRA = investmentAccounts.currentIRA || 0;
  const additionalIRA = Math.min(iraLimit - currentIRA, income * 0.05);
  
  if (additionalIRA > 0) {
    const newTax = calculateTax(income - additionalIRA, deductions, taxBrackets);
    optimizations.push({
      strategy: 'Traditional IRA Contribution',
      additionalContribution: additionalIRA,
      taxSavings: optimizedTax - newTax,
      netCost: additionalIRA - (optimizedTax - newTax)
    });
  }
  
  return {
    currentTax: optimizedTax,
    optimizations,
    totalPotentialSavings: optimizations.reduce((sum, opt) => sum + opt.taxSavings, 0)
  };
}

function optimizePortfolio({ holdings, riskTolerance, timeHorizon, goals }) {
  // Modern Portfolio Theory optimization
  const assetClasses = ['stocks', 'bonds', 'real_estate', 'commodities'];
  const riskProfiles = {
    conservative: { stocks: 0.3, bonds: 0.6, real_estate: 0.05, commodities: 0.05 },
    moderate: { stocks: 0.6, bonds: 0.3, real_estate: 0.07, commodities: 0.03 },
    aggressive: { stocks: 0.8, bonds: 0.1, real_estate: 0.07, commodities: 0.03 }
  };
  
  const targetAllocation = riskProfiles[riskTolerance] || riskProfiles.moderate;
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  
  const currentAllocation = {};
  assetClasses.forEach(assetClass => {
    const classValue = holdings
      .filter(holding => holding.assetClass === assetClass)
      .reduce((sum, holding) => sum + holding.currentValue, 0);
    currentAllocation[assetClass] = totalValue > 0 ? classValue / totalValue : 0;
  });
  
  const rebalanceRecommendations = [];
  assetClasses.forEach(assetClass => {
    const currentPercent = currentAllocation[assetClass];
    const targetPercent = targetAllocation[assetClass];
    const difference = targetPercent - currentPercent;
    
    if (Math.abs(difference) > 0.05) { // 5% threshold
      const dollarAmount = difference * totalValue;
      rebalanceRecommendations.push({
        assetClass,
        currentPercent: currentPercent * 100,
        targetPercent: targetPercent * 100,
        action: difference > 0 ? 'buy' : 'sell',
        amount: Math.abs(dollarAmount)
      });
    }
  });
  
  return {
    currentAllocation,
    targetAllocation,
    rebalanceRecommendations,
    totalValue,
    riskScore: calculatePortfolioRisk(currentAllocation),
    expectedReturn: calculateExpectedReturn(currentAllocation)
  };
}

// Helper functions
function calculateReturns(transactions) {
  // Simplified return calculation
  const dailyReturns = [];
  const monthlyReturns = [];
  
  // Group by day and calculate daily returns
  const dailyGroups = _.groupBy(transactions, transaction => 
    moment(transaction.date).format('YYYY-MM-DD')
  );
  
  const sortedDays = Object.keys(dailyGroups).sort();
  let previousValue = 0;
  
  sortedDays.forEach(day => {
    const dayTransactions = dailyGroups[day];
    const dayValue = dayTransactions.reduce((sum, t) => 
      sum + (t.shares * t.price), 0
    );
    
    if (previousValue > 0) {
      const dailyReturn = (dayValue - previousValue) / previousValue;
      dailyReturns.push(dailyReturn);
    }
    
    previousValue = dayValue;
  });
  
  // Calculate monthly returns from daily returns
  const monthlyGroups = _.groupBy(dailyReturns, (_, index) => Math.floor(index / 30));
  Object.values(monthlyGroups).forEach(monthReturns => {
    const monthlyReturn = monthReturns.reduce((product, ret) => product * (1 + ret), 1) - 1;
    monthlyReturns.push(monthlyReturn);
  });
  
  const yearlyReturn = dailyReturns.reduce((product, ret) => product * (1 + ret), 1) - 1;
  
  return {
    daily: dailyReturns,
    monthly: monthlyReturns,
    yearly: yearlyReturn
  };
}

function calculateVolatility(returns) {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance * 252); // Annualized volatility
}

function calculateSharpeRatio(returns, riskFreeRate) {
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const volatility = calculateVolatility(returns);
  return volatility > 0 ? (avgReturn - riskFreeRate / 252) / (volatility / Math.sqrt(252)) : 0;
}

function calculateVaR(returns, confidence) {
  if (returns.length === 0) return 0;
  
  const sortedReturns = returns.sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sortedReturns.length);
  return sortedReturns[index] || 0;
}

function calculateMaxDrawdown(returns) {
  let maxDrawdown = 0;
  let peak = 0;
  let cumulativeReturn = 1;
  
  returns.forEach(ret => {
    cumulativeReturn *= (1 + ret);
    if (cumulativeReturn > peak) {
      peak = cumulativeReturn;
    }
    const drawdown = (peak - cumulativeReturn) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });
  
  return maxDrawdown;
}

function calculateBeta(returns, marketReturns) {
  if (returns.length !== marketReturns.length || returns.length < 2) return 1;
  
  const covariance = _.sum(_.zip(returns, marketReturns).map(([r, m]) => 
    (r - _.mean(returns)) * (m - _.mean(marketReturns))
  )) / (returns.length - 1);
  
  const marketVariance = _.sum(marketReturns.map(m => 
    Math.pow(m - _.mean(marketReturns), 2)
  )) / (marketReturns.length - 1);
  
  return marketVariance > 0 ? covariance / marketVariance : 1;
}

function calculateAssetAllocation(holdings, totalValue) {
  const allocation = {};
  
  holdings.forEach(holding => {
    const category = holding.category || 'Other';
    const percentage = totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0;
    
    if (allocation[category]) {
      allocation[category] += percentage;
    } else {
      allocation[category] = percentage;
    }
  });
  
  return Object.keys(allocation).map(category => ({
    category,
    percentage: allocation[category]
  }));
}

function generateRecommendations(analysis, settings) {
  const recommendations = [];
  
  // Diversification recommendations
  if (analysis.assetAllocation.length < 3) {
    recommendations.push({
      type: 'diversification',
      priority: 'high',
      message: 'Consider diversifying across more asset classes to reduce risk'
    });
  }
  
  // Risk-based recommendations
  if (analysis.riskMetrics.portfolioVolatility > 0.25) {
    recommendations.push({
      type: 'risk',
      priority: 'medium',
      message: 'Portfolio volatility is high. Consider reducing exposure to high-risk assets'
    });
  }
  
  // Performance recommendations
  if (analysis.performance.sharpeRatio < 0.5) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: 'Risk-adjusted returns could be improved. Review asset allocation'
    });
  }
  
  return recommendations;
}

function generateCompoundInterestBreakdown(principal, rate, time, frequency) {
  const breakdown = [];
  const periods = time * frequency;
  const periodRate = rate / frequency;
  let currentAmount = principal;
  
  for (let i = 1; i <= periods; i++) {
    const interest = currentAmount * periodRate;
    currentAmount += interest;
    
    breakdown.push({
      period: i,
      principalAmount: principal,
      interestEarned: interest,
      totalAmount: currentAmount
    });
  }
  
  return breakdown;
}

function generateAmortizationSchedule(principal, rate, term, monthlyPayment) {
  const schedule = [];
  let remainingBalance = principal;
  const monthlyRate = rate / 12;
  
  for (let month = 1; month <= term; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
    
    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance)
    });
    
    if (remainingBalance <= 0) break;
  }
  
  return schedule;
}

function calculateRequiredMonthlyContribution(targetAmount, rate, years) {
  const monthlyRate = rate / 12;
  const totalMonths = years * 12;
  
  return targetAmount * monthlyRate / (Math.pow(1 + monthlyRate, totalMonths) - 1);
}

function calculateTax(income, deductions, taxBrackets) {
  const taxableIncome = Math.max(0, income - deductions);
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of taxBrackets) {
    const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableAtThisBracket * bracket.rate;
    remainingIncome -= taxableAtThisBracket;
    
    if (remainingIncome <= 0) break;
  }
  
  return tax;
}

function calculatePortfolioRisk(allocation) {
  const riskWeights = {
    stocks: 0.8,
    bonds: 0.2,
    real_estate: 0.5,
    commodities: 0.7
  };
  
  return Object.keys(allocation).reduce((risk, assetClass) => {
    return risk + (allocation[assetClass] * (riskWeights[assetClass] || 0.5));
  }, 0);
}

function calculateExpectedReturn(allocation) {
  const expectedReturns = {
    stocks: 0.10,
    bonds: 0.04,
    real_estate: 0.08,
    commodities: 0.06
  };
  
  return Object.keys(allocation).reduce((expectedReturn, assetClass) => {
    return expectedReturn + (allocation[assetClass] * (expectedReturns[assetClass] || 0.06));
  }, 0);
}

// Start the worker
performCalculations();
