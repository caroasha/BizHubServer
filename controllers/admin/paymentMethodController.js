const PaymentMethod = require('../../models/admin/PaymentMethod');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getSettings = asyncHandler(async (req, res) => {
  let settings = await PaymentMethod.findOne().lean();
  if (!settings) {
    settings = await PaymentMethod.create({});
  }
  sendSuccess(res, settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  const {
    momoStkActive, stripeActive, stripePublicKey,
    momoSendActive, momoSendNumber,
    momoTillActive, momoTillNumber,
    momoPaybillActive, momoPaybillBusiness, momoPaybillAccount,
    requireProof,
  } = req.body;

  let settings = await PaymentMethod.findOne();
  if (!settings) settings = new PaymentMethod();

  if (momoStkActive !== undefined) settings.momoStkActive = momoStkActive;
  if (stripeActive !== undefined) settings.stripeActive = stripeActive;
  if (stripePublicKey !== undefined) settings.stripePublicKey = stripePublicKey;
  if (momoSendActive !== undefined) settings.momoSendActive = momoSendActive;
  if (momoSendNumber !== undefined) settings.momoSendNumber = momoSendNumber;
  if (momoTillActive !== undefined) settings.momoTillActive = momoTillActive;
  if (momoTillNumber !== undefined) settings.momoTillNumber = momoTillNumber;
  if (momoPaybillActive !== undefined) settings.momoPaybillActive = momoPaybillActive;
  if (momoPaybillBusiness !== undefined) settings.momoPaybillBusiness = momoPaybillBusiness;
  if (momoPaybillAccount !== undefined) settings.momoPaybillAccount = momoPaybillAccount;
  if (requireProof !== undefined) settings.requireProof = requireProof;

  settings.updatedBy = req.admin._id;
  await settings.save();

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'payment_methods.updated',
    module: 'admin',
    details: req.body,
  });

  sendSuccess(res, settings, 'Payment methods updated');
});

const getPublicMethods = asyncHandler(async (req, res) => {
  const settings = await PaymentMethod.findOne().lean();
  if (!settings) {
    return sendSuccess(res, { methods: [] });
  }

  const methods = [];
  if (settings.momoStkActive) methods.push({ type: 'momo_stk', name: 'M-Pesa STK Push' });
  if (settings.stripeActive) methods.push({ type: 'stripe', name: 'Card (Stripe)' });
  if (settings.momoSendActive) methods.push({ type: 'momo_send', name: 'Send Money', number: settings.momoSendNumber });
  if (settings.momoTillActive) methods.push({ type: 'momo_till', name: 'Till Number', number: settings.momoTillNumber });
  if (settings.momoPaybillActive) methods.push({ type: 'momo_paybill', name: 'Paybill', business: settings.momoPaybillBusiness, account: settings.momoPaybillAccount });

  sendSuccess(res, { methods, requireProof: settings.requireProof });
});

module.exports = { getSettings, updateSettings, getPublicMethods };