const ServiceSale = require('../../models/cyber/ServiceSale');
const Service = require('../../models/cyber/Service');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, paymentStatus, source } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (paymentStatus) { const statuses = paymentStatus.split(','); filter.paymentStatus = { $in: statuses }; }
  if (source) filter.source = source;
  const [sales, total] = await Promise.all([ServiceSale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(), ServiceSale.countDocuments(filter)]);
  sendPaginated(res, sales, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

const create = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod } = req.body;
  if (!items?.length) throw new ApiError(400, 'Items required');
  let total = 0; const saleItems = [];
  for (const item of items) {
    const service = await Service.findOne({ _id: item.serviceId, tenantId: req.tenant._id });
    if (!service) throw new ApiError(404, 'Service not found');
    const rate = service.ratePerPage || service.ratePerItem || 0;
    const itemTotal = rate * item.quantity; total += itemTotal;
    saleItems.push({ serviceId: service._id, serviceName: service.name, quantity: item.quantity, rate, total: itemTotal });
  }
  const receiptNumber = generateReceiptNo('cyber', Date.now());
  const sale = await ServiceSale.create({ tenantId: req.tenant._id, receiptNumber, customerName: customerName || 'Walk-in', customerPhone: customerPhone || null, items: saleItems, totalAmount: total, paymentMethod: paymentMethod || 'cash', paymentStatus: 'paid', source: 'pos', createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'CyberUser', action: 'sale.created', module: 'cyber', resource: 'ServiceSale', resourceId: sale._id });

  if (customerEmail) {
    try {
      await emailService.send({ to: customerEmail, subject: `Receipt #${receiptNumber}`, html: `<p>Service total: KSh ${total.toLocaleString()}</p>` });
    } catch (err) { logger.error('Failed to send receipt:', err.message); }
  }

  sendSuccess(res, sale, 'Sale completed', 201);
});

const createInvoice = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod } = req.body;
  let total = 0; const saleItems = [];
  if (items?.length) {
    for (const item of items) {
      const service = await Service.findOne({ _id: item.serviceId, tenantId: req.tenant._id });
      if (!service) throw new ApiError(404, 'Service not found');
      const rate = service.ratePerPage || service.ratePerItem || 0;
      const itemTotal = rate * item.quantity; total += itemTotal;
      saleItems.push({ serviceId: service._id, serviceName: service.name, quantity: item.quantity, rate, total: itemTotal });
    }
  }
  const receiptNumber = generateReceiptNo('cyber', Date.now());
  const sale = await ServiceSale.create({ tenantId: req.tenant._id, receiptNumber, customerName: customerName || 'Walk-in', customerPhone: customerPhone || null, items: saleItems, totalAmount: total, paymentMethod: paymentMethod || 'cash', paymentStatus: 'pending', source: 'invoice', createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'CyberUser', action: 'invoice.created', module: 'cyber', resource: 'ServiceSale', resourceId: sale._id });
  sendSuccess(res, sale, 'Invoice created', 201);
});

const update = asyncHandler(async (req, res) => {
  const sale = await ServiceSale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Invoice not found');
  if (sale.paymentStatus === 'paid') throw new ApiError(400, 'Cannot edit paid');
  if (sale.paymentStatus === 'cancelled') throw new ApiError(400, 'Cannot edit cancelled');
  const { customerName, customerPhone, customerEmail, items, paymentMethod } = req.body;
  if (customerName !== undefined) sale.customerName = customerName;
  if (customerPhone !== undefined) sale.customerPhone = customerPhone;
  if (paymentMethod) sale.paymentMethod = paymentMethod;
  if (items?.length) {
    let total = 0; const saleItems = [];
    for (const item of items) {
      const service = await Service.findOne({ _id: item.serviceId, tenantId: req.tenant._id });
      if (!service) throw new ApiError(404, 'Service not found');
      const rate = service.ratePerPage || service.ratePerItem || 0;
      const itemTotal = rate * item.quantity; total += itemTotal;
      saleItems.push({ serviceId: service._id, serviceName: service.name, quantity: item.quantity, rate, total: itemTotal });
    }
    sale.items = saleItems; sale.totalAmount = total;
  }
  await sale.save();
  sendSuccess(res, sale, 'Invoice updated');
});

const markAsPaid = asyncHandler(async (req, res) => {
  const sale = await ServiceSale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Not found');
  if (sale.paymentStatus === 'paid') throw new ApiError(400, 'Already paid');
  sale.paymentStatus = 'paid'; await sale.save();

  if (sale.customerPhone) {
    try {
      await emailService.send({ to: sale.customerEmail || '', subject: `Receipt #${sale.receiptNumber}`, html: `<p>Total paid: KSh ${sale.totalAmount.toLocaleString()}</p>` });
    } catch (err) { logger.error('Failed to send receipt:', err.message); }
  }

  sendSuccess(res, sale, 'Marked as paid');
});

const cancel = asyncHandler(async (req, res) => {
  const sale = await ServiceSale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Not found');
  sale.paymentStatus = 'cancelled'; await sale.save();
  sendSuccess(res, sale, 'Cancelled');
});

const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');
  const sale = await ServiceSale.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!sale) throw new ApiError(404, 'Not found');
  await emailService.send({ to: email, subject: `Invoice #${sale.receiptNumber}`, html: `<p>Total: KSh ${sale.totalAmount.toLocaleString()}</p>` });
  sendSuccess(res, null, 'Sent');
});

module.exports = { getAll, create, createInvoice, update, markAsPaid, cancel, sendInvoiceEmail };