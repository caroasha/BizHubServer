const cron = require('node-cron');
const Tenant = require('../models/admin/Tenant');
const AuditLog = require('../models/admin/AuditLog');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ============================================
// Cleanup Scheduler - Runs Weekly (Sunday 3 AM)
// ============================================

const runCleanup = async () => {
  logger.info('Running cleanup scheduler...');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Delete trial accounts inactive for 30+ days
    const expiredTrials = await Tenant.deleteMany({
      status: 'trial_ended',
      updatedAt: { $lt: thirtyDaysAgo },
    });
    logger.info(`Cleaned ${expiredTrials.deletedCount} expired trial accounts`);

    // 2. Delete audit logs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldLogs = await AuditLog.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
    });
    logger.info(`Cleaned ${oldLogs.deletedCount} old audit logs`);

    // 3. Clean temp uploads older than 7 days
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      let deleted = 0;
      for (const file of files) {
        const filepath = path.join(uploadsDir, file);
        const stats = fs.statSync(filepath);

        if (stats.mtimeMs < sevenDaysAgo && file !== '.gitkeep') {
          fs.unlinkSync(filepath);
          deleted++;
        }
      }
      logger.info(`Cleaned ${deleted} old temp files`);
    }
  } catch (error) {
    logger.error('Cleanup scheduler error:', error);
  }
};

// Run weekly on Sunday at 3:00 AM
cron.schedule('0 3 * * 0', runCleanup);

module.exports = runCleanup;