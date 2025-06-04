# API Documentation for Finance Microservices

## Overview

This document provides comprehensive API documentation for the Finance Microservices architecture. All APIs are accessible through the API Gateway at `http://localhost:8080/api`.

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### POST /api/auth/register
Register new user account.

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "userpassword"
}
```

## Transaction Management

### GET /api/transactions
Get user transactions with optional filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by category
- `type` (optional): Filter by type (income/expense)
- `startDate` (optional): Filter from date (YYYY-MM-DD)
- `endDate` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "transactions": [
    {
      "id": "transaction_id",
      "amount": 100.50,
      "type": "expense",
      "category": "food",
      "description": "Lunch",
      "date": "2023-12-01T12:00:00Z",
      "userId": "user_id"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### POST /api/transactions
Create new transaction.

**Request Body:**
```json
{
  "amount": 100.50,
  "type": "expense",
  "category": "food",
  "description": "Lunch",
  "date": "2023-12-01T12:00:00Z"
}
```

### PUT /api/transactions/:id
Update existing transaction.

### DELETE /api/transactions/:id
Delete transaction.

## Processing Service APIs

### PDF Generation

#### POST /api/processing/pdf/generate
Generate PDF reports.

**Request Body:**
```json
{
  "type": "transaction_statement",
  "data": {
    "userId": "user_id",
    "dateRange": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    },
    "transactions": [],
    "metrics": {
      "totalIncome": 50000,
      "totalExpenses": 30000,
      "netIncome": 20000
    }
  },
  "options": {
    "format": "pdf",
    "includeCharts": true,
    "template": "standard"
  }
}
```

**Response:**
```json
{
  "jobId": "job_12345",
  "status": "queued",
  "message": "PDF generation job created"
}
```

#### GET /api/processing/pdf/status/:taskId
Check PDF generation status.

**Response:**
```json
{
  "jobId": "job_12345",
  "status": "completed",
  "progress": 100,
  "result": {
    "pdfUrl": "/api/processing/pdf/download/job_12345",
    "fileSize": 1048576,
    "pageCount": 5
  }
}
```

### Financial Calculations

#### POST /api/processing/calculations/portfolio
Analyze investment portfolio.

**Request Body:**
```json
{
  "transactions": [
    {
      "symbol": "AAPL",
      "amount": 1000,
      "shares": 10,
      "date": "2023-01-01",
      "type": "buy"
    }
  ],
  "settings": {
    "currency": "USD",
    "includeDiv dividends": true,
    "riskAssessment": true
  }
}
```

**Response:**
```json
{
  "jobId": "calc_12345",
  "status": "queued",
  "message": "Portfolio analysis job created"
}
```

#### POST /api/processing/calculations/bulk
Perform bulk financial calculations.

**Request Body:**
```json
{
  "operations": [
    {
      "type": "compound_interest",
      "principal": 10000,
      "rate": 0.05,
      "time": 10,
      "compound": "annually"
    },
    {
      "type": "loan_payment",
      "principal": 200000,
      "rate": 0.035,
      "term": 30
    }
  ]
}
```

### Report Generation

#### POST /api/processing/reports/generate
Generate comprehensive financial reports.

**Request Body:**
```json
{
  "reportType": "annual_summary",
  "dateRange": {
    "start": "2023-01-01",
    "end": "2023-12-31"
  },
  "filters": {
    "categories": ["income", "expenses"],
    "accounts": ["checking", "savings"]
  },
  "format": "pdf"
}
```

## Notification Service APIs

### Send Notifications

#### POST /api/notifications/send
Send notification to user(s).

**Request Body:**
```json
{
  "type": "transaction_alert",
  "title": "Large Transaction Alert",
  "message": "A transaction of $500 was made on your account",
  "channels": ["push", "email"],
  "recipients": ["user_id_1", "user_id_2"],
  "data": {
    "transactionId": "tx_12345",
    "amount": 500
  },
  "priority": "high",
  "scheduled": null
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "notif_12345",
  "status": "queued",
  "message": "Notification queued successfully"
}
```

#### POST /api/notifications/bulk
Send bulk notifications.

**Request Body:**
```json
{
  "notifications": [
    {
      "type": "budget_alert",
      "title": "Budget Alert",
      "message": "You've reached 80% of your monthly budget",
      "channels": ["push"],
      "recipients": ["user_id_1"]
    }
  ]
}
```

### Device Management

#### POST /api/notifications/register-device
Register device for push notifications.

**Request Body:**
```json
{
  "token": "device_token_here",
  "platform": "ios",
  "deviceId": "unique_device_id",
  "appVersion": "1.0.0"
}
```

#### DELETE /api/notifications/devices/:deviceId
Unregister device.

### Notification Preferences

#### GET /api/notifications/preferences
Get user notification preferences.

**Response:**
```json
{
  "transactionAlerts": {
    "push": true,
    "email": true,
    "sms": false
  },
  "budgetAlerts": {
    "push": true,
    "email": true,
    "sms": false
  },
  "investmentUpdates": {
    "push": true,
    "email": true,
    "sms": false
  }
}
```

#### PUT /api/notifications/preferences
Update notification preferences.

### Notification History

#### GET /api/notifications/history
Get notification history.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `type` (optional): Filter by notification type
- `status` (optional): Filter by status

## Health and Monitoring

### Health Checks

#### GET /api/health
API Gateway health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2023-12-01T12:00:00Z",
  "uptime": 3600,
  "endpoints": {
    "auth": "/api/auth/*",
    "transactions": "/api/transactions/*",
    "processing": "/api/processing/*",
    "notifications": "/api/notifications/*"
  }
}
```

#### GET /api/processing/health
Processing service health.

#### GET /api/notifications/health
Notification service health.

### Service Statistics

#### GET /api/processing/stats
Get processing service statistics.

**Response:**
```json
{
  "queues": {
    "pdf": {
      "waiting": 5,
      "active": 2,
      "completed": 1000,
      "failed": 10
    },
    "calculations": {
      "waiting": 0,
      "active": 1,
      "completed": 500,
      "failed": 2
    }
  },
  "workers": {
    "active": 4,
    "total": 4
  }
}
```

## Error Handling

All APIs follow standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2023-12-01T12:00:00Z",
  "path": "/api/transactions",
  "status": 400
}
```

## Rate Limiting

API Gateway implements rate limiting:
- **Default**: 100 requests per 15 minutes per IP
- **Notifications**: 100 notifications per hour per user
- **Processing**: 20 heavy computation requests per hour per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## WebSocket Events (Notifications)

Connect to WebSocket at `ws://localhost:8082`

### Authentication
Send after connection:
```json
{
  "event": "authenticate",
  "token": "jwt_token_here"
}
```

### Real-time Events
- `notification_received` - New notification
- `notification_read` - Notification marked as read
- `service_status` - Service status updates

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Authorization': `Bearer ${jwt_token}`
  }
});

// Send notification
const response = await client.post('/notifications/send', {
  type: 'transaction_alert',
  title: 'Transaction Alert',
  message: 'Your transaction has been processed',
  channels: ['push']
});
```

### Flutter/Dart
```dart
import 'package:dio/dio.dart';

final dio = Dio();
dio.options.baseUrl = 'http://localhost:8080/api';
dio.options.headers['Authorization'] = 'Bearer $jwtToken';

// Get transactions
final response = await dio.get('/transactions');
final transactions = response.data['transactions'];
```

## Testing

### Postman Collection
Import the provided Postman collection for API testing.

### cURL Examples
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get transactions
curl -X GET http://localhost:8080/api/transactions \
  -H "Authorization: Bearer $JWT_TOKEN"

# Send notification
curl -X POST http://localhost:8080/api/notifications/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","title":"Test","message":"Test message","channels":["push"]}'
```

---

For more information, see the [Architecture Documentation](README.md).
