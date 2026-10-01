const jwt = require('jsonwebtoken');
const env = require('../config/env');

// ============================================
// JWT Helpers
// ============================================

const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};