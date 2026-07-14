const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

// ============================================
// Rate Limiters
// ============================================

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    error: 'AUTH_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const mpesaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_MPESA_MAX,
  message: {
    success: false,
    message: 'Too many M-Pesa requests. Please wait.',
    error: 'MPESA_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter, mpesaLimiter };