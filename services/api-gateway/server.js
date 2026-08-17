const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Health Check & Gateway Telemetry
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    routes: {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
      events: process.env.EVENT_SERVICE_URL || 'http://localhost:5002',
      bookings: process.env.BOOKING_SERVICE_URL || 'http://localhost:5003',
      notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004',
      payments: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5005'
    }
  });
});

// Proxy routes to target microservices
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' }
  })
);

app.use(
  '/api/events',
  createProxyMiddleware({
    target: process.env.EVENT_SERVICE_URL || 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/api/events': '' }
  })
);

app.use(
  '/api/bookings',
  createProxyMiddleware({
    target: process.env.BOOKING_SERVICE_URL || 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/bookings': '' }
  })
);

app.use(
  '/api/notifications',
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004',
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '' }
  })
);

app.use(
  '/api/payments',
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5005',
    changeOrigin: true,
    pathRewrite: { '^/api/payments': '' }
  })
);

app.listen(PORT, () => {
  console.log(`[API-Gateway] Listening on port ${PORT}`);
});
