const Payment = require('../../models/admin/Payment');
const Invoice = require('../../models/admin/Invoice');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const { generateReceiptNo } = require('../../utils/generateId');
const { formatDate } = require('../../utils/formatters');

/* ================================================================
 * LIST — reads from Payment collection
 * ================================================================ */
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, method, startDate, endDate, search } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (method) filter.method = method;
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (search) {
    filter.$or = [
      { mpesaReceipt: { $regex: search, $options: 'i' } },
      { providerRef: { $regex: search, $options: 'i' } },
      { checkoutRequestId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('invoice', 'invoiceNumber currency amountDue amountPaid status')
      .populate('tenantId', 'businessName businessType owner contact')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payment.countDocuments(filter),
  ]);

  const data = payments.map((p) => ({
    _id: p._id,
    tenantId: p.tenantId || null,
    invoice: p.invoice || null,
    invoiceNumber: p.invoice?.invoiceNumber || null,
    amount: p.amount,
    currency: p.currency || 'KES',
    method: p.method,
    status: p.status,
    purpose: p.purpose,
    providerRef: p.providerRef,
    mpesaReceipt: p.mpesaReceipt,
    phone: p.phone,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return sendPaginated(res, data, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

/* ================================================================
 * GET ONE
 * ================================================================ */
const getById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('invoice')
    .populate('tenantId', 'businessName businessType owner contact')
    .lean();
  if (!payment) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  return sendSuccess(res, payment);
});

/* ================================================================
 * MANUAL PAYMENT — creates a Payment, not a Subscription
 * ================================================================ */
const manualInvoice = asyncHandler(async (req, res) => {
  const { tenantId, amount, description, method = 'manual', invoiceId } = req.body;
  if (!tenantId || !amount) throw new ApiError(400, 'Tenant ID and amount required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  // Resolve the invoice: passed in, or newest unpaid for this tenant
  let invoice = null;
  if (invoiceId) {
    invoice = await Invoice.findById(invoiceId);
  } else {
    invoice = await Invoice.findOne({
      tenantId: tenant._id,
      status: { $ne: 'paid' },
    }).sort({ createdAt: -1 });
  }

  if (!invoice) {
    throw new ApiError(400, 'No unpaid invoice found for this tenant', 'NO_INVOICE');
  }

  const receiptNo = generateReceiptNo(tenant.businessType, Math.floor(Math.random() * 9999) + 1);

  const payment = await Payment.create({
    tenantId: tenant._id,
    userId: invoice.user || tenant._id,
    userModel: invoice.userModel || null,
    invoice: invoice._id,
    purpose: 'manual',
    method,
    amount,
    currency: invoice.currency || 'KES',
    status: 'success',
    providerRef: receiptNo,
    notes: description || null,
  });

  // Flip the invoice to paid if the manual amount covers it
  if (invoice.status !== 'paid' && amount >= (invoice.amountDue || 0)) {
    invoice.status = 'paid';
    invoice.paymentState = 'paid';
    invoice.amountPaid = amount;
    invoice.amountDue = 0;
    invoice.paidAt = new Date();
    invoice.paymentMethod = method;
    invoice.paymentRef = receiptNo;
    await invoice.save();
  }

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'payment.manual',
    module: 'admin',
    resource: 'Payment',
    resourceId: payment._id,
    details: { amount, description, method, invoiceNumber: invoice.invoiceNumber },
  });

  // Fire-and-forget notifications
  Promise.resolve().then(async () => {
    try {
      if (tenant.contact?.email || tenant.owner?.email) {
        await emailService.sendTemplate('tenantPaymentReceipt', tenant.contact?.email || tenant.owner.email, {
          name: tenant.owner?.name,
          businessName: tenant.businessName,
          invoiceNumber: invoice.invoiceNumber,
          amountPaid: amount,
          currency: invoice.currency || 'KES',
          paymentMethod: method,
          paymentReference: receiptNo,
          paidAt: new Date(),
          planName: invoice.plan || 'Manual',
        });
      }
    } catch (err) {
      // logged by emailService
    }

    try {
      if (tenant.contact?.phone || tenant.owner?.phone) {
        await smsService.sendTemplate('tenantPaymentReceipt', tenant.contact?.phone || tenant.owner.phone, {
          businessName: tenant.businessName,
          invoiceNumber: invoice.invoiceNumber,
          amount,
          reference: receiptNo,
        });
      }
    } catch (err) {
      // logged by smsService
    }
  }).catch(() => {});

  return sendSuccess(res, payment, 'Manual payment recorded', 201);
});

/* ================================================================
 * REFUND — updates a Payment
 * ================================================================ */
const refund = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('tenantId', 'businessName owner contact');
  if (!payment) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');

  if (payment.status === 'refunded') {
    throw new ApiError(400, 'Payment already refunded', 'ALREADY_REFUNDED');
  }

  payment.status = 'refunded';
  payment.notes = req.body.reason ? `${payment.notes || ''}\nRefund: ${req.body.reason}`.trim() : payment.notes;
  await payment.save();

  await AuditLog.create({
    tenantId: payment.tenantId?._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'payment.refunded',
    module: 'admin',
    resource: 'Payment',
    resourceId: payment._id,
    details: { reason: req.body.reason, amount: payment.amount },
  });

  const tenant = payment.tenantId;
  if (tenant && (tenant.contact?.email || tenant.owner?.email)) {
    Promise.resolve().then(async () => {
      try {
        await emailService.sendTemplate('tenantPaymentReceipt', tenant.contact?.email || tenant.owner.email, {
          name: tenant.owner?.name,
          businessName: tenant.businessName,
          invoiceNumber: `REF-${payment._id.toString().slice(-8)}`,
          amountPaid: payment.amount,
          currency: payment.currency || 'KES',
          paymentMethod: 'Refund',
          paymentReference: `REF-${payment._id.toString().slice(-8)}`,
          paidAt: new Date(),
          planName: 'Refund',
        });
      } catch (err) {
        // logged
      }
    }).catch(() => {});
  }

  return sendSuccess(res, payment, 'Payment refunded');
});

/* ================================================================
 * STATS — aggregates from Payment
 * ================================================================ */
const getStats = asyncHandler(async (req, res) => {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [totalRevenue, monthlyRevenue, totalPayments, activeCount] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'success', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.countDocuments({ status: 'success' }),
    // Active subscriptions still come from Subscription
    require('../../models/admin/Subscription').countDocuments({ status: 'active' }),
  ]);

  return sendSuccess(res, {
    totalRevenue: totalRevenue[0]?.total || 0,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    totalPayments,
    activeSubscriptions: activeCount,
  });
});

module.exports = { getAll, getById, manualInvoice, refund, getStats };