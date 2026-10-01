const env = require('../../config/env');
const logger = require('../../utils/logger');

// ============================================
// Global Error Handler
// ============================================

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for: ${field}`;
    errorCode = 'DUPLICATE_KEY';
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errorCode = 'INVALID_ID';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', err);
  } else {
    logger.warn(`${errorCode}: ${message}`);
  }

  // Response
  res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
    ...(env.isDevelopment() && { stack: err.stack }),
  });
};

module.exports = errorHandler;