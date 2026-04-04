require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const analysisRoutes = require('./routes/analysis');
const doctorRoutes = require('./routes/doctor');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — restrict to frontend URL
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Rate limiting for analysis routes (10 requests per user per minute)
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: 'Too many requests. Please try again in a minute.',
    code: 'RATE_LIMITED',
  },
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analysis', analysisLimiter, analysisRoutes);
app.use('/api/doctor', doctorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  });
});

app.listen(PORT, () => {
  console.log(`ClinicalCoPilot API running on port ${PORT}`);
});

module.exports = app;
