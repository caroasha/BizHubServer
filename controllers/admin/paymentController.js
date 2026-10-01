const Subscription = require('../../models/admin/Subscription');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const { generateReceiptNo } = require('../../utils/generateId');
const { formatDate } = require('../../utils/formatters');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, method, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (method) filter['paymentDetails.method'] = method;
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [payments, total] = await Promise.all([
    Subscription.find(filter)
      .populate('tenantId', 'businessName businessType owner')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  sendPaginated(res, payments, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const payment = await Subscription.findById(req.params.id)
    .populate('tenantId', 'businessName businessType owner contact')
    .lean();
  if (!payment) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  sendSuccess(res, payment);
});

const manualInvoice = asyncHandler(async (req, res) => {
  const { tenantId, amount, description } = req.body;
  if (!tenantId || !amount) throw new ApiError(400, 'Tenant ID and amount required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const invoiceNo = generateReceiptNo(tenant.businessType, Math.floor(Math.random() * 9999) + 1);

  const payment = await Subscription.create({
    tenantId: tenant._id,
    plan: 'manual',
    amount,
    currency: 'KES',
    startDate: new Date(),
    endDate: new Date(),
    status: 'active',
    paymentDetails: {
      method: 'manual',
      transactionId: invoiceNo,
      amount,
    },
  });

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'payment.manual',
    module: 'admin',
    resource: 'Subscription',
    resourceId: payment._id,
    details: { amount, description },
  });

  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.send({
      to: tenant.contact?.email || tenant.owner.email,
      subject: `Payment Receipt - ${tenant.businessName}`,
      html: require('../../templates/emailTemplates').paymentReceipt({
        name: tenant.owner.name,
        businessName: tenant.businessName,
        receiptNo: invoiceNo,
        amount,
        method: 'Manual',
        date: formatDate(new Date()),
        description,
      }),
    });
  }

  if (tenant.contact?.phone || tenant.owner?.phone) {
    await smsService.send({
      to: tenant.contact?.phone || tenant.owner.phone,
      message: require('../../templates/smsTemplates').paymentConfirmation({
        amount,
        ref: invoiceNo,
        businessName: tenant.businessName,
      }),
    });
  }

  sendSuccess(res, payment, 'Manual payment recorded', 201);
});

const refund = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id).populate('tenantId', 'businessName owner contact');
  if (!subscription) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  subscription.cancelReason = req.body.reason || 'Refunded by admin';
  await subscription.save();

  await AuditLog.create({
    tenantId: subscription.tenantId?._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'payment.refunded',
    module: 'admin',
    resource: 'Subscription',
    resourceId: subscription._id,
    details: { reason: req.body.reason, amount: subscription.amount },
  });

  const tenant = subscription.tenantId;
  if (tenant) {
    if (tenant.contact?.email || tenant.owner?.email) {
      await emailService.send({
        to: tenant.contact?.email || tenant.owner.email,
        subject: `Refund Processed - ${tenant.businessName}`,
        html: require('../../templates/emailTemplates').paymentReceipt({
          name: tenant.owner.name,
          businessName: tenant.businessName,
          receiptNo: `REF-${subscription._id.toString().slice(-8)}`,
          amount: subscription.amount,
          method: 'Refund',
          date: formatDate(new Date()),
          description: subscription.cancelReason,
        }),
      });
    }
  }

  sendSuccess(res, subscription, 'Payment refunded');
});

const getStats = asyncHandler(async (req, res) => {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [totalRevenue, monthlyRevenue, totalPayments, activeCount] = await Promise.all([
    Subscription.aggregate([
      { $match: { status: 'active', 'paymentDetails.method': { $ne: 'trial' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: thisMonth }, status: 'active', 'paymentDetails.method': { $ne: 'trial' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.countDocuments({ 'paymentDetails.method': { $ne: 'trial' } }),
    Subscription.countDocuments({ status: 'active' }),
  ]);

  sendSuccess(res, {
    totalRevenue: totalRevenue[0]?.total || 0,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    totalPayments,
    activeSubscriptions: activeCount,
  });
});

module.exports = { getAll, getById, manualInvoice, refund, getStats };