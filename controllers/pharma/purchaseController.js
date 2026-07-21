const PurchaseOrder = require('../../models/pharma/PurchaseOrder');
const Medicine = require('../../models/pharma/Medicine');
const Supplier = require('../../models/pharma/Supplier');
const Account = require('../../models/pharma/Account');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateOrderNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const templates = require('../../templates/pharmaEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, supplierId } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter).populate('supplierId', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    PurchaseOrder.countDocuments(filter),
  ]);

  sendPaginated(res, orders, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

const getById = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenant._id }).populate('supplierId', 'name email phone').lean();
  if (!order) throw new ApiError(404, 'Order not found');
  sendSuccess(res, order);
});

const create = asyncHandler(async (req, res) => {
  const { supplierId, items, expectedDelivery, notes } = req.body;
  if (!supplierId || !items || !items.length) throw new ApiError(400, 'Supplier and items required');

  let totalAmount = 0;
  const orderItems = items.map(item => {
    const total = item.unitPrice * item.quantity;
    totalAmount += total;
    return { ...item, totalPrice: total };
  });

  const orderNumber = generateOrderNo('pharma', Date.now());
  const order = await PurchaseOrder.create({
    tenantId: req.tenant._id, supplierId, orderNumber,
    items: orderItems, totalAmount, expectedDelivery, notes,
    createdBy: req.user._id,
  });

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser', action: 'purchase_order.created', module: 'pharma', resource: 'PurchaseOrder', resourceId: order._id, details: { orderNumber, totalAmount } });
  sendSuccess(res, order, 'Order created', 201);
});

const sendToSupplier = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenant._id }).populate('supplierId').lean();
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.supplierId?.email) throw new ApiError(400, 'Supplier has no email');

  const Tenant = require('../../models/admin/Tenant');
  const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
  const html = await templates.purchaseOrder({ order, supplier: order.supplierId, businessName: tenant?.businessName || 'Pharmacy', tenantId: req.tenant._id });

  await emailService.send({ to: order.supplierId.email, subject: `Purchase Order #${order.orderNumber}`, html });

  order.status = 'ordered';
  await PurchaseOrder.findByIdAndUpdate(order._id, { status: 'ordered' });

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser', action: 'purchase_order.sent', module: 'pharma', resource: 'PurchaseOrder', resourceId: order._id });
  sendSuccess(res, null, 'Order sent to supplier');
});

const receive = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status === 'received') throw new ApiError(400, 'Already received');
  if (order.status === 'cancelled') throw new ApiError(400, 'Order is cancelled');

  const { items } = req.body; // [{ medicineId?, medicineName, orderedQty, receivedQty, newBP, newSP, dosage, categoryId, batchNo, expiryDate }]
  let totalCost = 0;

  for (const item of items) {
    const receivedQty = parseInt(item.receivedQty) || 0;
    if (receivedQty <= 0) continue;

    let medicine = item.medicineId ? await Medicine.findOne({ _id: item.medicineId, tenantId: req.tenant._id }) : null;

    if (medicine) {
      // Existing medicine - update stock, optionally update prices
      medicine.stock += receivedQty;
      if (item.newBP !== undefined && item.newBP !== '' && item.newBP !== null) medicine.buyingPrice = parseFloat(item.newBP);
      if (item.newSP !== undefined && item.newSP !== '' && item.newSP !== null) medicine.sellingPrice = parseFloat(item.newSP);
      await medicine.save();
    } else {
      // New medicine - create
      medicine = await Medicine.create({
        tenantId: req.tenant._id,
        name: item.medicineName,
        buyingPrice: parseFloat(item.newBP) || 0,
        sellingPrice: parseFloat(item.newSP) || 0,
        stock: receivedQty,
        dosage: item.dosage || null,
        categoryId: item.categoryId || null,
        batchNo: item.batchNo || null,
        expiryDate: item.expiryDate || null,
        minStockAlert: 5,
        createdBy: req.user._id,
      });
    }

    totalCost += (parseFloat(item.newBP) || medicine.buyingPrice || 0) * receivedQty;
  }

  // Record expense
  if (totalCost > 0) {
    await Account.create({
      tenantId: req.tenant._id,
      type: 'expense',
      category: 'purchase',
      amount: totalCost,
      description: `Purchase Order #${order.orderNumber}`,
      date: new Date(),
      reference: { model: 'PurchaseOrder', id: order._id },
      createdBy: req.user._id,
    });
  }

  order.status = 'received';
  order.receivedDate = new Date();
  order.receivedBy = req.user._id;
  await order.save();

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser', action: 'purchase_order.received', module: 'pharma', resource: 'PurchaseOrder', resourceId: order._id, details: { totalCost } });
  sendSuccess(res, order, 'Order received');
});

module.exports = { getAll, getById, create, sendToSupplier, receive };