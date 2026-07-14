const cloudinary = require('cloudinary').v2;
const env = require('./env');
const logger = require('../utils/logger');

// ============================================
// Cloudinary Configuration
// ============================================

let isConfigured = false;

const configureCloudinary = () => {
  if (env.STORAGE_PROVIDER !== 'cloudinary') {
    logger.info('Cloudinary not selected as storage provider. Using local storage.');
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });

    isConfigured = true;
    logger.info('Cloudinary configured successfully');
    return true;
  } catch (error) {
    logger.error('Cloudinary configuration failed:', error.message);
    return false;
  }
};

const getCloudinary = () => (isConfigured ? cloudinary : null);

module.exports = { configureCloudinary, getCloudinary };