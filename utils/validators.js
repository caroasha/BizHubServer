const Joi = require('joi');

// ============================================
// Reusable Joi Validation Schemas
// ============================================

const emailSchema = Joi.string().email().max(255).messages({
  'string.email': 'Please provide a valid email address',
  'string.max': 'Email must not exceed 255 characters',
});

const phoneSchema = Joi.string().pattern(/^\+?[0-9]{10,15}$/).messages({
  'string.pattern.base': 'Please provide a valid phone number',
});

const kenyanPhoneSchema = Joi.string().pattern(/^(?:\+254|254|0)?[17][0-9]{8}$/).messages({
  'string.pattern.base': 'Please provide a valid Kenyan phone number',
});

const passwordSchema = Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/).messages({
  'string.min': 'Password must be at least 8 characters',
  'string.max': 'Password must not exceed 128 characters',
  'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
});

const pinSchema = Joi.string().length(4).pattern(/^\d{4}$/).messages({
  'string.length': 'PIN must be exactly 4 digits',
  'string.pattern.base': 'PIN must contain only digits',
});

const objectIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Please provide a valid ID',
});

const mpesaAmountSchema = Joi.number().min(1).max(150000).messages({
  'number.min': 'Amount must be at least 1',
  'number.max': 'Amount must not exceed 150,000',
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  emailSchema,
  phoneSchema,
  kenyanPhoneSchema,
  passwordSchema,
  pinSchema,
  objectIdSchema,
  mpesaAmountSchema,
  paginationSchema,
};