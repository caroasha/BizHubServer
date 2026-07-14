// ============================================
// Custom API Error Class
// ============================================

class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;