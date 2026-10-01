const cron = require('node-cron');
const backupService = require('../services/backupService');
const logger = require('../utils/logger');

// ============================================
// Auto Backup Scheduler - Runs Daily at 2 AM
// ============================================

const runBackup = async () => {
  logger.info('Running backup scheduler...');

  try {
    const result = await backupService.createBackup();

    if (result.success) {
      logger.info(`Backup created: ${result.filename}`);

      // Cleanup old backups (older than 30 days)
      const cleanup = await backupService.deleteOldBackups(30);
      logger.info(`Backup cleanup: ${cleanup.deleted} old backups removed`);
    } else {
      logger.error('Backup failed:', result.error);
    }
  } catch (error) {
    logger.error('Backup scheduler error:', error);
  }
};

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', runBackup);

module.exports = runBackup;