const cron = require('node-cron');
const dayjs = require('dayjs');
const Medicine = require('../models/pharma/Medicine');
const Tenant = require('../models/admin/Tenant');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

// ============================================
// Medicine Expiry Scheduler - Runs Daily at 6 AM
// ============================================

const checkExpiry = async () => {
  logger.info('Running expiry scheduler...');

  try {
    const today = dayjs().startOf('day');

    // Find medicines expiring within 30 days
    const thirtyDaysFromNow = today.add(30, 'day').toDate();
    const medicines = await Medicine.find({
      expiryDate: { $lte: thirtyDaysFromNow, $gte: today.toDate() },
      stock: { $gt: 0 },
    }).populate({
      path: 'tenantId',
      model: 'Tenant',
    });

    // Group by tenant
    const byTenant = {};
    for (const med of medicines) {
      const tenantId = med.tenantId?._id?.toString();
      if (!tenantId) continue;
      if (!byTenant[tenantId]) byTenant[tenantId] = { tenant: med.tenantId, items: [] };
      byTenant[tenantId].items.push(med);
    }

    for (const [tenantId, data] of Object.entries(byTenant)) {
      const { tenant, items } = data;

      // Items expiring in 7 days or less
      const urgent = items.filter((i) => {
        const daysLeft = dayjs(i.expiryDate).diff(today, 'day');
        return daysLeft <= 7;
      });

      // Items expiring today
      const todayItems = items.filter((i) => {
        return dayjs(i.expiryDate).isSame(today, 'day');
      });

      // Items expiring in 7 days
      const weekItems = items.filter((i) => {
        const daysLeft = dayjs(i.expiryDate).diff(today, 'day');
        return daysLeft <= 7 && daysLeft > 0;
      });

      // Send alerts for items expiring in 7 days
      if (weekItems.length > 0) {
        await emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `Medicine Expiry Alert - ${tenant.businessName}`,
          html: require('../templates/emailTemplates').expiryAlert({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            items: weekItems.map((i) => ({
              name: i.name,
              batchNo: i.batchNo,
              expiryDate: dayjs(i.expiryDate).format('DD/MM/YYYY'),
            })),
            daysUntilExpiry: 7,
          }),
        });

        for (const item of weekItems) {
          await smsService.send({
            to: tenant.contact.phone || tenant.owner.phone,
            message: require('../templates/smsTemplates').expiryAlert7Days({
              businessName: tenant.businessName,
              medicineName: item.name,
              expiryDate: dayjs(item.expiryDate).format('DD/MM/YYYY'),
            }),
          });
        }

        logger.info(`Expiry alert (7 days): ${tenant.businessName}, ${weekItems.length} items`);
      }

      // Send alerts for items expiring today
      if (todayItems.length > 0) {
        for (const item of todayItems) {
          await smsService.send({
            to: tenant.contact.phone || tenant.owner.phone,
            message: require('../templates/smsTemplates').expiryAlertToday({
              businessName: tenant.businessName,
              medicineName: item.name,
            }),
          });
        }

        await emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `URGENT: Medicines Expiring Today - ${tenant.businessName}`,
          html: require('../templates/emailTemplates').expiryAlert({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            items: todayItems.map((i) => ({
              name: i.name,
              batchNo: i.batchNo,
              expiryDate: 'TODAY',
            })),
            daysUntilExpiry: 0,
          }),
        });

        logger.info(`Expiry alert (TODAY): ${tenant.businessName}, ${todayItems.length} items`);
      }
    }
  } catch (error) {
    logger.error('Expiry scheduler error:', error);
  }
};

// Run daily at 6:00 AM
cron.schedule('0 6 * * *', checkExpiry);

module.exports = checkExpiry;