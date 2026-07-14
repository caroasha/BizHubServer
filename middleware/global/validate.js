const ApiError = require('../../utils/ApiError');

// ============================================
// Joi Validation Middleware
// ============================================

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];

    if (!data) {
      return next(new ApiError(400, `Request ${source} is required`, 'MISSING_DATA'));
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message).join(', ');
      return next(new ApiError(400, messages, 'VALIDATION_ERROR'));
    }

    req[source] = value;
    next();
  };
};

module.exports = validate;