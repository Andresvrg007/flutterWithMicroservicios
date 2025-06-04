// 📝 REQUEST LOGGER - TRACKS ALL INCOMING REQUESTS
// Middleware personalizado para logging detallado

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log the incoming request
  if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    
    // Log request body for POST/PUT/PATCH (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const safeBody = { ...req.body };
      // Remove sensitive fields
      delete safeBody.password;
      delete safeBody.token;
      delete safeBody.authorization;
      
      if (Object.keys(safeBody).length > 0) {
        console.log(`📄 Request Body:`, JSON.stringify(safeBody, null, 2));
      }
    }
  }

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
      console.log(`📤 ${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${responseTime}ms`);
      
      // Log error responses
      if (res.statusCode >= 400) {
        console.log(`❌ Error Response:`, JSON.stringify(data, null, 2));
      }
    }
    
    originalJson.call(this, data);
  };

  next();
};

module.exports = requestLogger;
