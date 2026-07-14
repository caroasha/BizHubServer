const Tenant = require('../../models/admin/Tenant');
const Subscription = require('../../models/admin/Subscription');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const mpesaService = require('../../services/mpesaService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const { generateReceiptNo } = require('../../utils/generateId');
const { formatDate } = require('../../utils/formatters');

const initiateMpesaPayment = asyncHandler(async (req, res) => {
  const { tenantId, phone, amount, plan } = req.body;
  if (!tenantId || !phone || !amount) throw new ApiError(400, 'Tenant ID, phone, and amount required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const accountRef = `${tenant.businessName.substring(0, 12)}-${plan || 'sub'}`;
  const result = await mpesaService.stkPush({
    phone,
    amount,
    accountRef,
    description: `BizHub ${plan || 'Subscription'}`,
  });

  if (!result.success) throw new ApiError(400, result.error || 'Payment failed', 'MPESA_ERROR');

  sendSuccess(res, {
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    message: result.customerMessage,
  }, 'Payment initiated');
});

const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;
  if (!checkoutRequestId) throw new ApiError(400, 'Checkout request ID required');

  const result = await mpesaService.queryStatus(checkoutRequestId);

  if (result.success && result.resultCode === 0) {
    const receiptNo = result.mpesaReceiptNumber || generateReceiptNo('payment', Date.now());

    const subscription = await Subscription.findOneAndUpdate(
      { 'paymentDetails.merchantRequestId': checkoutRequestId },
      {
        status: 'active',
        'paymentDetails.transactionId': result.mpesaReceiptNumber,
        'paymentDetails.mpesaReceiptNumber': result.mpesaReceiptNumber,
        'paymentDetails.phone': result.phoneNumber,
        'paymentDetails.date': new Date(),
      },
      { new: true }
    ).populate('tenantId');

    if (subscription?.tenantId) {
      const tenant = subscription.tenantId;
      if (tenant.contact?.email || tenant.owner?.email) {
        await emailService.send({
          to: tenant.contact?.email || tenant.owner.email,
          subject: `Payment Receipt - ${tenant.businessName}`,
          html: require('../../templates/emailTemplates').paymentReceipt({
            name: tenant.owner.name,
            businessName: tenant.businessName,
            receiptNo,
            amount: result.amount || subscription.amount,
            method: 'M-Pesa',
            date: formatDate(new Date()),
          }),
        });
      }

      if (tenant.contact?.phone || tenant.owner?.phone) {
        await smsService.send({
          to: tenant.contact?.phone || tenant.owner.phone,
          message: require('../../templates/smsTemplates').paymentConfirmation({
            amount: result.amount || subscription.amount,
            ref: receiptNo,
            businessName: tenant.businessName,
          }),
        });
      }
    }
  }

  sendSuccess(res, result);
});

module.exports = { initiateMpesaPayment, checkPaymentStatus };