const cron = require('node-cron');
const dayjs = require('dayjs');
const Product = require('../models/electro/Product');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

// ============================================
// Warranty Scheduler - Runs Daily at 9 AM
// ============================================

const checkWarranties = async () => {
  logger.info('Running warranty scheduler...');

  try {
    const today = dayjs().startOf('day');

    // Products with warranty ending in 30 days
    const thirtyDaysFromNow = today.add(30, 'day').toDate();
    const products = await Product.find({
      warranty: { $exists: true },
      warrantyEnd: { $lte: thirtyDaysFromNow, $gte: today.toDate() },
    }).populate('tenantId');

    for (const product of products) {
      const tenant = product.tenantId;
      if (!tenant) continue;

      const daysLeft = dayjs(product.warrantyEnd).diff(today, 'day');

      // 30 days remaining
      if (daysLeft === 30) {
        await emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `Warranty Expiring - ${product.name}`,
          html: require('../templates/emailTemplates').warrantyExpiring({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            product: product.name,
            warrantyEnd: dayjs(product.warrantyEnd).format('DD/MM/YYYY'),
            daysLeft,
          }),
        });

        logger.info(`Warranty expiring (30 days): ${product.name} at ${tenant.businessName}`);
      }

      // 14 days remaining
      if (daysLeft === 14) {
        await smsService.send({
          to: tenant.contact.phone || tenant.owner.phone,
          message: require('../templates/smsTemplates').warrantyExpiring({
            product: product.name,
            expiryDate: dayjs(product.warrantyEnd).format('DD/MM/YYYY'),
            businessName: tenant.businessName,
          }),
        });

        logger.info(`Warranty expiring (14 days): ${product.name} at ${tenant.businessName}`);
      }
    }
  } catch (error) {
    logger.error('Warranty scheduler error:', error);
  }
};

// Run daily at 9:00 AM
cron.schedule('0 9 * * *', checkWarranties);

module.exports = checkWarranties;