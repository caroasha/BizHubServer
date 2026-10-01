const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

// ============================================
// MongoDB Connection
// ============================================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    // Connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;