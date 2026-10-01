const cron = require('node-cron');
const dayjs = require('dayjs');
const Lease = require('../models/apartment/Lease');
const RentPayment = require('../models/apartment/RentPayment');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

// ============================================
// Rent Scheduler - Runs Daily at 7 AM
// ============================================

const checkRent = async () => {
  logger.info('Running rent scheduler...');

  try {
    const today = dayjs().startOf('day');

    // Active leases
    const activeLeases = await Lease.find({
      status: 'active',
    }).populate('tenantId').populate('unitId');

    for (const lease of activeLeases) {
      const tenant = lease.tenantId;
      const unit = lease.unitId;
      if (!tenant || !unit) continue;

      const rentDueDay = dayjs(lease.startDate).date(); // Day of month rent is due
      const currentDueDate = dayjs().date(rentDueDay);
      const daysUntilDue = currentDueDate.diff(today, 'day');
      const daysOverdue = today.diff(currentDueDate, 'day');

      const monthName = today.format('MMMM YYYY');

      // Check if already paid this month
      const alreadyPaid = await RentPayment.findOne({
        leaseId: lease._id,
        month: monthName,
        status: 'paid',
      });

      if (alreadyPaid) continue;

      // 5 days before due
      if (daysUntilDue === 5) {
        await smsService.send({
          to: tenant.phone,
          message: require('../templates/smsTemplates').rentReminder({
            unitNumber: unit.number,
            amount: lease.rent,
            dueDate: currentDueDate.format('DD/MM/YYYY'),
            businessName: 'Property Management',
          }),
        });

        logger.info(`Rent reminder (5 days): ${tenant.name}, Unit ${unit.number}`);
      }

      // 3 days before due
      if (daysUntilDue === 3) {
        await emailService.send({
          to: tenant.email,
          subject: `Rent Reminder - Unit ${unit.number}`,
          html: require('../templates/emailTemplates').rentReminder({
            name: tenant.name,
            businessName: 'Property Management',
            unitNumber: unit.number,
            amount: lease.rent,
            dueDate: currentDueDate.format('DD/MM/YYYY'),
            daysLeft: daysUntilDue,
          }),
        });

        logger.info(`Rent reminder (3 days): ${tenant.name}, Unit ${unit.number}`);
      }

      // Due today
      if (daysUntilDue === 0) {
        await smsService.send({
          to: tenant.phone,
          message: require('../templates/smsTemplates').rentDueToday({
            unitNumber: unit.number,
            amount: lease.rent,
            businessName: 'Property Management',
          }),
        });

        logger.info(`Rent due today: ${tenant.name}, Unit ${unit.number}`);
      }

      // 3 days overdue
      if (daysOverdue === 3) {
        await smsService.send({
          to: tenant.phone,
          message: require('../templates/smsTemplates').rentOverdue({
            unitNumber: unit.number,
            amount: lease.rent,
            daysOverdue,
            businessName: 'Property Management',
          }),
        });

        await emailService.send({
          to: tenant.email,
          subject: `Rent Overdue - Unit ${unit.number}`,
          html: require('../templates/emailTemplates').rentOverdue({
            name: tenant.name,
            businessName: 'Property Management',
            unitNumber: unit.number,
            amount: lease.rent,
            dueDate: currentDueDate.format('DD/MM/YYYY'),
            daysOverdue,
          }),
        });

        logger.info(`Rent overdue: ${tenant.name}, Unit ${unit.number}`);
      }

      // Lease expiring in 30 days
      const leaseEnd = dayjs(lease.endDate);
      const daysToLeaseEnd = leaseEnd.diff(today, 'day');

      if (daysToLeaseEnd === 30 || daysToLeaseEnd === 14) {
        await emailService.send({
          to: tenant.email,
          subject: `Lease Expiring - Unit ${unit.number}`,
          html: require('../templates/emailTemplates').leaseExpiring({
            name: tenant.name,
            businessName: 'Property Management',
            unitNumber: unit.number,
            expiryDate: leaseEnd.format('DD/MM/YYYY'),
            daysLeft: daysToLeaseEnd,
          }),
        });

        await smsService.send({
          to: tenant.phone,
          message: require('../templates/smsTemplates').leaseExpiring({
            unitNumber: unit.number,
            expiryDate: leaseEnd.format('DD/MM/YYYY'),
            businessName: 'Property Management',
          }),
        });

        logger.info(`Lease expiring in ${daysToLeaseEnd} days: ${tenant.name}`);
      }
    }
  } catch (error) {
    logger.error('Rent scheduler error:', error);
  }
};

// Run daily at 7:00 AM
cron.schedule('0 7 * * *', checkRent);

module.exports = checkRent;