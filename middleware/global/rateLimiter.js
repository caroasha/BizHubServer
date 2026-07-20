const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 900000,
  max: env.RATE_LIMIT_MAX_REQUESTS || 1000,
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
  max: env.RATE_LIMIT_AUTH_MAX || 100,
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
  max: env.RATE_LIMIT_MPESA_MAX || 50,
  message: {
    success: false,
    message: 'Too many M-Pesa requests. Please wait.',
    error: 'MPESA_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter, mpesaLimiter };