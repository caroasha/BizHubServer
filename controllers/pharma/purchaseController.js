const PurchaseOrder = require('../../models/pharma/PurchaseOrder');
const Medicine = require('../../models/pharma/Medicine');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateOrderNo } = require('../../utils/generateId');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, supplierId } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter).populate('supplierId', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    PurchaseOrder.countDocuments(filter),
  ]);

  sendPaginated(res, orders, {
    page: parseInt(page), limit: parseInt(limit),
    totalPages: Math.ceil(total / limit), totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenant._id }).populate('supplierId', 'name phone').lean();
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
    tenantId: req.tenant._id,
    supplierId,
    orderNumber,
    items: orderItems,
    totalAmount,
    expectedDelivery,
    notes,
    createdBy: req.user._id,
  });

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'purchase_order.created', module: 'pharma', resource: 'PurchaseOrder', resourceId: order._id, details: { orderNumber, totalAmount } });
  sendSuccess(res, order, 'Order created', 201);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await PurchaseOrder.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!order) throw new ApiError(404, 'Order not found');

  order.status = status;
  if (status === 'received') {
    order.receivedDate = new Date();
    order.receivedBy = req.user._id;
    for (const item of order.items) {
      await Medicine.findOneAndUpdate(
        { _id: item.medicineId, tenantId: req.tenant._id },
        { $inc: { stock: item.quantity } }
      );
    }
  }
  await order.save();

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'purchase_order.status_updated', module: 'pharma', resource: 'PurchaseOrder', resourceId: order._id, details: { status } });
  sendSuccess(res, order, 'Status updated');
});

module.exports = { getAll, getById, create, updateStatus };