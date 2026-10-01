const Sale = require('../../models/electro/Sale');
const Product = require('../../models/electro/Product');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const templates = require('../../templates/electroEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, startDate, endDate, paymentStatus, search, source } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (paymentStatus) { const statuses = paymentStatus.split(','); filter.paymentStatus = { $in: statuses }; }
  if (source) filter.source = source;
  if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  if (search) filter.$or = [{ receiptNumber: { $regex: search, $options: 'i' } }, { customerName: { $regex: search, $options: 'i' } }, { customerPhone: { $regex: search, $options: 'i' } }];
  const [sales, total] = await Promise.all([Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(), Sale.countDocuments(filter)]);
  sendPaginated(res, sales, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

const getById = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!sale) throw new ApiError(404, 'Sale not found');
  sendSuccess(res, sale);
});

const create = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod, discount, notes } = req.body;
  if (!items?.length) throw new ApiError(400, 'Items required');
  let subtotal = 0; const saleItems = [];
  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, tenantId: req.tenant._id });
    if (!product) throw new ApiError(404, 'Product not found');
    if (product.stock < item.quantity) throw new ApiError(400, `Insufficient stock for ${product.name}. Available: ${product.stock}`);
    const total = product.sellingPrice * item.quantity; subtotal += total;
    saleItems.push({ productId: product._id, productName: product.name, serialNo: product.serialNo, quantity: item.quantity, unitPrice: product.sellingPrice, totalPrice: total });
    product.stock -= item.quantity; await product.save();
  }
  const receiptNumber = generateReceiptNo('electronics', Date.now());
  const totalAmount = subtotal - (discount || 0);
  const sale = await Sale.create({ tenantId: req.tenant._id, receiptNumber, customerName: customerName || 'Walk-in Customer', customerPhone: customerPhone || null, customerEmail: customerEmail || null, items: saleItems, subtotal, discount: discount || 0, totalAmount, paymentMethod: paymentMethod || 'cash', paymentStatus: 'paid', source: 'pos', notes, createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'ElectroUser', action: 'sale.created', module: 'electro', resource: 'Sale', resourceId: sale._id, details: { receiptNumber, totalAmount, source: 'pos' } });

  if (customerEmail) {
    try {
      const html = await templates.saleInvoice({ tenantId: req.tenant._id, sale: { ...sale.toObject(), items: saleItems } });
      await emailService.send({ to: customerEmail, subject: `Receipt #${receiptNumber}`, html });
    } catch (err) { logger.error('Failed to send invoice:', err.message); }
  }

  sendSuccess(res, { ...sale.toObject(), items: saleItems }, 'Sale completed', 201);
});

const createInvoice = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod, discount, notes } = req.body;
  let subtotal = 0; const saleItems = [];
  if (items?.length) {
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenantId: req.tenant._id });
      if (!product) throw new ApiError(404, 'Product not found');
      const total = product.sellingPrice * item.quantity; subtotal += total;
      saleItems.push({ productId: product._id, productName: product.name, serialNo: product.serialNo, quantity: item.quantity, unitPrice: product.sellingPrice, totalPrice: total });
    }
  }
  const receiptNumber = generateReceiptNo('electronics', Date.now());
  const totalAmount = subtotal - (discount || 0);
  const sale = await Sale.create({ tenantId: req.tenant._id, receiptNumber, customerName: customerName || 'Walk-in Customer', customerPhone: customerPhone || null, customerEmail: customerEmail || null, items: saleItems, subtotal, discount: discount || 0, totalAmount, paymentMethod: paymentMethod || 'cash', paymentStatus: 'pending', source: 'invoice', notes, createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'ElectroUser', action: 'invoice.created', module: 'electro', resource: 'Sale', resourceId: sale._id });
  sendSuccess(res, sale, 'Invoice created', 201);
});

const update = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Invoice not found');
  if (sale.paymentStatus === 'paid') throw new ApiError(400, 'Cannot edit paid invoice');
  if (sale.paymentStatus === 'cancelled') throw new ApiError(400, 'Cannot edit cancelled invoice');
  const { customerName, customerPhone, customerEmail, items, paymentMethod, discount, notes } = req.body;
  if (customerName !== undefined) sale.customerName = customerName;
  if (customerPhone !== undefined) sale.customerPhone = customerPhone;
  if (customerEmail !== undefined) sale.customerEmail = customerEmail;
  if (paymentMethod) sale.paymentMethod = paymentMethod;
  if (discount !== undefined) sale.discount = discount;
  if (notes !== undefined) sale.notes = notes;
  if (items?.length) {
    let subtotal = 0; const saleItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenantId: req.tenant._id });
      if (!product) throw new ApiError(404, 'Product not found');
      const total = product.sellingPrice * item.quantity; subtotal += total;
      saleItems.push({ productId: product._id, productName: product.name, serialNo: product.serialNo, quantity: item.quantity, unitPrice: product.sellingPrice, totalPrice: total });
    }
    sale.items = saleItems; sale.subtotal = subtotal; sale.totalAmount = subtotal - (discount || 0);
  }
  await sale.save();
  sendSuccess(res, sale, 'Invoice updated');
});

const markAsPaid = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Invoice not found');
  if (sale.paymentStatus === 'paid') throw new ApiError(400, 'Already paid');
  if (sale.paymentStatus === 'cancelled') throw new ApiError(400, 'Cannot pay cancelled');
  for (const item of sale.items) {
    const product = await Product.findOne({ _id: item.productId, tenantId: req.tenant._id });
    if (!product) continue;
    if (product.stock < item.quantity) throw new ApiError(400, `Insufficient stock for ${product.name}`);
    product.stock -= item.quantity; await product.save();
  }
  sale.paymentStatus = 'paid'; await sale.save();

  if (sale.customerEmail) {
    try {
      const html = await templates.saleInvoice({ tenantId: req.tenant._id, sale: sale.toObject() });
      await emailService.send({ to: sale.customerEmail, subject: `Receipt #${sale.receiptNumber}`, html });
    } catch (err) { logger.error('Failed to send invoice:', err.message); }
  }

  sendSuccess(res, sale, 'Marked as paid');
});

const cancel = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Not found');
  if (sale.paymentStatus === 'cancelled') throw new ApiError(400, 'Already cancelled');
  if (sale.paymentStatus === 'paid') {
    for (const item of sale.items) await Product.findOneAndUpdate({ _id: item.productId }, { $inc: { stock: item.quantity } });
  }
  sale.paymentStatus = 'cancelled'; await sale.save();
  sendSuccess(res, sale, 'Cancelled');
});

const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!sale) throw new ApiError(404, 'Not found');
  const html = await templates.saleInvoice({ tenantId: req.tenant._id, sale });
  await emailService.send({ to: email, subject: `Invoice #${sale.receiptNumber}`, html });
  sendSuccess(res, null, 'Sent');
});

const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [todaySales, todayRevenue, monthSales, monthRevenue] = await Promise.all([
    Sale.countDocuments({ tenantId, createdAt: { $gte: today }, paymentStatus: 'paid' }),
    Sale.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: today }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Sale.countDocuments({ tenantId, createdAt: { $gte: thisMonth }, paymentStatus: 'paid' }),
    Sale.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);
  sendSuccess(res, { todaySales, todayRevenue: todayRevenue[0]?.total || 0, monthSales, monthRevenue: monthRevenue[0]?.total || 0 });
});

module.exports = { getAll, getById, create, createInvoice, update, markAsPaid, cancel, sendInvoiceEmail, getStats };