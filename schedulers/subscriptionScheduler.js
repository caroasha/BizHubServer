const cron = require('node-cron');
const dayjs = require('dayjs');
const Subscription = require('../models/admin/Subscription');
const Tenant = require('../models/admin/Tenant');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

// ============================================
// Subscription Scheduler - Runs Daily at 8 AM
// ============================================

const checkSubscriptions = async () => {
  logger.info('Running subscription scheduler...');

  try {
    const today = dayjs().startOf('day');
    const activeSubs = await Subscription.find({
      status: 'active',
      endDate: { $exists: true },
    }).populate('tenantId');

    for (const sub of activeSubs) {
      const tenant = sub.tenantId;
      if (!tenant) continue;

      const endDate = dayjs(sub.endDate);
      const daysLeft = endDate.diff(today, 'day');

      // Expiring in 7 days
      if (daysLeft === 7) {
        const email = emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `Subscription Expiring Soon - ${tenant.businessName}`,
          html: require('../templates/emailTemplates').subscriptionExpiring({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            plan: sub.plan,
            expiryDate: endDate.format('DD/MM/YYYY'),
            daysLeft,
          }),
        });

        const sms = smsService.send({
          to: tenant.contact.phone || tenant.owner.phone,
          message: require('../templates/smsTemplates').subscriptionExpiring({
            businessName: tenant.businessName,
            daysLeft,
          }),
        });

        await Promise.allSettled([email, sms]);
        logger.info(`Subscription expiring in 7 days: ${tenant.businessName}`);
      }

      // Expiring in 3 days
      if (daysLeft === 3) {
        const sms = smsService.send({
          to: tenant.contact.phone || tenant.owner.phone,
          message: require('../templates/smsTemplates').subscriptionExpiring({
            businessName: tenant.businessName,
            daysLeft,
          }),
        });

        await sms;
        logger.info(`Subscription expiring in 3 days: ${tenant.businessName}`);
      }

      // Expired today
      if (daysLeft <= 0) {
        sub.status = 'expired';
        await sub.save();

        await emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `Subscription Expired - ${tenant.businessName}`,
          html: require('../templates/emailTemplates').subscriptionExpired({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            expiryDate: endDate.format('DD/MM/YYYY'),
          }),
        });

        logger.info(`Subscription expired: ${tenant.businessName}`);
      }
    }

    // Check trial tenants
    const trialTenants = await Tenant.find({
      status: 'trial',
      createdAt: { $exists: true },
    });

    for (const tenant of trialTenants) {
      const trialStart = dayjs(tenant.createdAt);
      const trialEnd = trialStart.add(14, 'day');
      const daysLeft = trialEnd.diff(today, 'day');

      // Trial ending in 3 days
      if (daysLeft === 3) {
        await emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `Trial Ending Soon - ${tenant.businessName}`,
          html: require('../templates/emailTemplates').trialEnding({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            trialEndDate: trialEnd.format('DD/MM/YYYY'),
            daysLeft,
          }),
        });

        await smsService.send({
          to: tenant.contact.phone || tenant.owner.phone,
          message: require('../templates/smsTemplates').trialEnding({
            businessName: tenant.businessName,
            daysLeft,
          }),
        });

        logger.info(`Trial ending in 3 days: ${tenant.businessName}`);
      }

      // Trial ended
      if (daysLeft <= 0) {
        tenant.status = 'trial_ended';
        await tenant.save();

        await emailService.send({
          to: tenant.contact.email || tenant.owner.email,
          subject: `Trial Ended - ${tenant.businessName}`,
          html: require('../templates/emailTemplates').trialEnded({
            name: tenant.owner.name,
            businessName: tenant.businessName,
          }),
        });

        logger.info(`Trial ended: ${tenant.businessName}`);
      }
    }
  } catch (error) {
    logger.error('Subscription scheduler error:', error);
  }
};

// Run daily at 8:00 AM
cron.schedule('0 8 * * *', checkSubscriptions);

module.exports = checkSubscriptions;