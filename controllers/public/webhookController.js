const Subscription = require('../../models/admin/Subscription');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const mpesaService = require('../../services/mpesaService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const { generateReceiptNo } = require('../../utils/generateId');
const { formatDate } = require('../../utils/formatters');
const logger = require('../../utils/logger');

const mpesaCallback = asyncHandler(async (req, res) => {
  logger.info('M-Pesa callback received:', JSON.stringify(req.body));

  const result = mpesaService.processCallback(req.body);

  if (result.success) {
    const subscription = await Subscription.findOne({
      'paymentDetails.checkoutRequestId': result.checkoutRequestId,
    }).populate('tenantId');

    if (subscription) {
      subscription.status = 'active';
      subscription.paymentDetails.transactionId = result.mpesaReceiptNumber;
      subscription.paymentDetails.mpesaReceiptNumber = result.mpesaReceiptNumber;
      subscription.paymentDetails.phone = result.phoneNumber;
      subscription.paymentDetails.amount = result.amount;
      subscription.paymentDetails.date = new Date();
      await subscription.save();

      const tenant = subscription.tenantId;
      if (tenant) {
        const receiptNo = generateReceiptNo(tenant.businessType, Date.now());

        if (tenant.contact?.email || tenant.owner?.email) {
          await emailService.send({
            to: tenant.contact?.email || tenant.owner.email,
            subject: `Payment Confirmed - ${tenant.businessName}`,
            html: require('../../templates/emailTemplates').paymentReceipt({
              name: tenant.owner.name,
              businessName: tenant.businessName,
              receiptNo,
              amount: result.amount,
              method: 'M-Pesa',
              date: formatDate(new Date()),
            }),
          });
        }

        if (tenant.contact?.phone || tenant.owner?.phone) {
          await smsService.send({
            to: tenant.contact?.phone || tenant.owner.phone,
            message: require('../../templates/smsTemplates').paymentConfirmation({
              amount: result.amount,
              ref: receiptNo,
              businessName: tenant.businessName,
            }),
          });
        }

        await AuditLog.create({
          tenantId: tenant._id,
          action: 'payment.mpesa_callback',
          module: 'admin',
          resource: 'Subscription',
          resourceId: subscription._id,
          details: result,
        });
      }
    }
  }

  res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

module.exports = { mpesaCallback };