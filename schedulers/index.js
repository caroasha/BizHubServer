const subscriptionScheduler = require('./subscriptionScheduler');
const rentScheduler = require('./rentScheduler');
const expiryScheduler = require('./expiryScheduler');
const warrantyScheduler = require('./warrantyScheduler');
const stockScheduler = require('./stockScheduler');
const backupScheduler = require('./backupScheduler');
const cleanupScheduler = require('./cleanupScheduler');
const logger = require('../utils/logger');

const startSchedulers = () => {
  logger.info('Starting all schedulers...');
  subscriptionScheduler;   // Daily 8 AM
  rentScheduler;           // Daily 7 AM
  expiryScheduler;         // Daily 6 AM
  warrantyScheduler;       // Daily 9 AM
  stockScheduler;          // Every 6 hours
  backupScheduler;         // Daily 2 AM
  cleanupScheduler;        // Weekly Sun 3 AM
  logger.info('All schedulers started');
};

module.exports = startSchedulers;