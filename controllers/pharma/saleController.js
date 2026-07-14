const Sale = require('../../models/pharma/Sale');
const Medicine = require('../../models/pharma/Medicine');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const pharmaTemplates = require('../../templates/pharmaEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, startDate, endDate, paymentStatus, search, source } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (paymentStatus) {
    const statuses = paymentStatus.split(',');
    filter.paymentStatus = { $in: statuses };
  }
  if (source) filter.source = source;
  if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  if (search) filter.$or = [{ receiptNumber: { $regex: search, $options: 'i' } }, { customerName: { $regex: search, $options: 'i' } }, { customerPhone: { $regex: search, $options: 'i' } }];

  const [sales, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Sale.countDocuments(filter),
  ]);

  sendPaginated(res, sales, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

const getById = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!sale) throw new ApiError(404, 'Sale not found');
  sendSuccess(res, sale);
});

const create = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod, discount, notes } = req.body;
  if (!items || !items.length) throw new ApiError(400, 'Items required');

  let subtotal = 0;
  const saleItems = [];

  for (const item of items) {
    const medicine = await Medicine.findOne({ _id: item.medicineId, tenantId: req.tenant._id });
    if (!medicine) throw new ApiError(404, `Medicine not found`);
    if (medicine.stock < item.quantity) throw new ApiError(400, `Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);

    const totalPrice = medicine.sellingPrice * item.quantity;
    subtotal += totalPrice;

    saleItems.push({
      medicineId: medicine._id, medicineName: medicine.name,
      batchNo: medicine.batchNo, dosage: medicine.dosage,
      quantity: item.quantity, unitPrice: medicine.sellingPrice, totalPrice,
    });

    medicine.stock -= item.quantity;
    await medicine.save();
  }

  const totalAmount = subtotal - (discount || 0);
  const receiptNumber = generateReceiptNo('pharma', Date.now());

  const sale = await Sale.create({
    tenantId: req.tenant._id, receiptNumber,
    customerName: customerName || 'Walk-in Customer',
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    items: saleItems, subtotal, discount: discount || 0, totalAmount,
    paymentMethod: paymentMethod || 'cash', paymentStatus: 'paid', source: 'pos',
    notes, createdBy: req.user._id,
  });

  await AuditLog.create({
    tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser',
    action: 'sale.created', module: 'pharma', resource: 'Sale', resourceId: sale._id,
    details: { receiptNumber, totalAmount, source: 'pos' },
  });

  if (customerEmail) {
    try {
      const Tenant = require('../../models/admin/Tenant');
      const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
      const html = await pharmaTemplates.saleInvoice({ tenantId: req.tenant._id, sale: { ...sale.toObject(), items: saleItems } });
      await emailService.send({ to: customerEmail, subject: `Invoice #${receiptNumber} - ${tenant?.businessName || 'Pharmacy'}`, html });
    } catch (err) { logger.error('Failed to send invoice email:', err.message); }
  }

  sendSuccess(res, { ...sale.toObject(), items: saleItems }, 'Sale completed', 201);
});

const createInvoice = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod, discount, notes } = req.body;

  let subtotal = 0;
  const saleItems = [];

  if (items && items.length > 0) {
    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicineId, tenantId: req.tenant._id });
      if (!medicine) throw new ApiError(404, `Medicine not found`);
      const totalPrice = medicine.sellingPrice * item.quantity;
      subtotal += totalPrice;
      saleItems.push({
        medicineId: medicine._id, medicineName: medicine.name,
        batchNo: medicine.batchNo, dosage: medicine.dosage,
        quantity: item.quantity, unitPrice: medicine.sellingPrice, totalPrice,
      });
    }
  }

  const totalAmount = subtotal - (discount || 0);
  const receiptNumber = generateReceiptNo('pharma', Date.now());

  const sale = await Sale.create({
    tenantId: req.tenant._id, receiptNumber,
    customerName: customerName || 'Walk-in Customer',
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    items: saleItems, subtotal, discount: discount || 0, totalAmount,
    paymentMethod: paymentMethod || 'cash', paymentStatus: 'pending', source: 'invoice',
    notes, createdBy: req.user._id,
  });

  await AuditLog.create({
    tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser',
    action: 'invoice.created', module: 'pharma', resource: 'Sale', resourceId: sale._id,
    details: { receiptNumber, totalAmount, source: 'invoice' },
  });

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

  if (items && items.length > 0) {
    let subtotal = 0;
    const saleItems = [];
    for (const item of items) {
      const medicine = await Medicine.findOne({ _id: item.medicineId, tenantId: req.tenant._id });
      if (!medicine) throw new ApiError(404, `Medicine not found`);
      const totalPrice = medicine.sellingPrice * item.quantity;
      subtotal += totalPrice;
      saleItems.push({
        medicineId: medicine._id, medicineName: medicine.name,
        batchNo: medicine.batchNo, dosage: medicine.dosage,
        quantity: item.quantity, unitPrice: medicine.sellingPrice, totalPrice,
      });
    }
    sale.items = saleItems;
    sale.subtotal = subtotal;
    sale.totalAmount = subtotal - (discount || 0);
  }

  await sale.save();

  await AuditLog.create({
    tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser',
    action: 'invoice.updated', module: 'pharma', resource: 'Sale', resourceId: sale._id,
  });

  sendSuccess(res, sale, 'Invoice updated');
});

const markAsPaid = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Invoice not found');
  if (sale.paymentStatus === 'paid') throw new ApiError(400, 'Already paid');
  if (sale.paymentStatus === 'cancelled') throw new ApiError(400, 'Cannot pay cancelled invoice');

  for (const item of sale.items) {
    const medicine = await Medicine.findOne({ _id: item.medicineId, tenantId: req.tenant._id });
    if (!medicine) continue;
    if (medicine.stock < item.quantity) throw new ApiError(400, `Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
    medicine.stock -= item.quantity;
    await medicine.save();
  }

  sale.paymentStatus = 'paid';
  await sale.save();

  await AuditLog.create({
    tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser',
    action: 'invoice.paid', module: 'pharma', resource: 'Sale', resourceId: sale._id,
  });

  // Send invoice email if customer email exists
  if (sale.customerEmail) {
    try {
      const Tenant = require('../../models/admin/Tenant');
      const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
      const html = await pharmaTemplates.saleInvoice({ tenantId: req.tenant._id, sale: sale.toObject() });
      await emailService.send({ to: sale.customerEmail, subject: `Invoice #${sale.receiptNumber} - ${tenant?.businessName || 'Pharmacy'}`, html });
    } catch (err) { logger.error('Failed to send invoice email:', err.message); }
  }

  sendSuccess(res, sale, 'Invoice marked as paid');
});

const cancel = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!sale) throw new ApiError(404, 'Sale not found');
  if (sale.paymentStatus === 'cancelled') throw new ApiError(400, 'Already cancelled');

  if (sale.paymentStatus === 'paid') {
    for (const item of sale.items) {
      await Medicine.findOneAndUpdate(
        { _id: item.medicineId, tenantId: req.tenant._id },
        { $inc: { stock: item.quantity } }
      );
    }
  }

  sale.paymentStatus = 'cancelled';
  await sale.save();

  await AuditLog.create({
    tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser',
    action: sale.source === 'invoice' ? 'invoice.cancelled' : 'sale.cancelled',
    module: 'pharma', resource: 'Sale', resourceId: sale._id,
  });

  sendSuccess(res, sale, 'Cancelled');
});

const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');

  const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!sale) throw new ApiError(404, 'Not found');

  const Tenant = require('../../models/admin/Tenant');
  const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
  const html = await pharmaTemplates.saleInvoice({ tenantId: req.tenant._id, sale });

  await emailService.send({ to: email, subject: `Invoice #${sale.receiptNumber} - ${tenant?.businessName || 'Pharmacy'}`, html });

  await AuditLog.create({
    tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser',
    action: 'invoice.emailed', module: 'pharma', resource: 'Sale', resourceId: sale._id,
  });

  sendSuccess(res, null, `Invoice sent to ${email}`);
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