const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  HOST: process.env.HOST || '0.0.0.0',
  API_VERSION: process.env.API_VERSION || 'v1',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  APP_NAME: process.env.APP_NAME || 'BizHub',
  APP_DESCRIPTION: process.env.APP_DESCRIPTION || 'Universal Business Management Suite',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  APP_TIMEZONE: process.env.APP_TIMEZONE || 'Africa/Nairobi',
  APP_CURRENCY: process.env.APP_CURRENCY || 'KES',

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/bizhub',

  REDIS_ENABLED: process.env.REDIS_ENABLED === 'true',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',

  MPESA_ENVIRONMENT: process.env.MPESA_ENVIRONMENT || 'sandbox',
  MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET,
  MPESA_PASSKEY: process.env.MPESA_PASSKEY,
  MPESA_SHORTCODE: process.env.MPESA_SHORTCODE || '174379',
  MPESA_CALLBACK_BASE_URL: process.env.MPESA_CALLBACK_BASE_URL,
  MPESA_STK_TIMEOUT: parseInt(process.env.MPESA_STK_TIMEOUT, 10) || 3000,

  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'hdmBridge',
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'hdmBridge',

  HDM_API_URL: process.env.HDM_API_URL || 'https://api.hdmbridge.com/api',
  HDM_API_KEY: process.env.HDM_API_KEY,
  HDM_FROM_EMAIL: process.env.HDM_FROM_EMAIL || 'noreply@bizhub.co.ke',
  HDM_FROM_NAME: process.env.HDM_FROM_NAME || 'BizHub',

  BREVO_API_KEY: process.env.BREVO_API_KEY,

  HDM_AI_BASE_URL: process.env.HDM_AI_BASE_URL || 'https://hdmaiserver.pxxl.click/api/v1',
  HDM_AI_API_KEY: process.env.HDM_AI_API_KEY,

  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10,

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  RATE_LIMIT_AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 20,
  RATE_LIMIT_MPESA_MAX: parseInt(process.env.RATE_LIMIT_MPESA_MAX, 10) || 5,

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_PATH: process.env.LOG_FILE_PATH || './logs',
  LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE !== 'false',
  LOG_TO_FILE: process.env.LOG_TO_FILE === 'true',

  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'admin@bizhub.co.ke',
  SUPER_ADMIN_PHONE: process.env.SUPER_ADMIN_PHONE || '254700000000',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123!',
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || 'BizHub Admin',

  isProduction() { return this.NODE_ENV === 'production'; },
  isDevelopment() { return this.NODE_ENV === 'development'; },
};

// Validate required production env vars
if (env.isProduction()) {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  const missing = required.filter(key => !env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

module.exports = env;