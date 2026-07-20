const Order = require('../../models/resto/Order');
const MenuItem = require('../../models/resto/MenuItem');
const Transaction = require('../../models/resto/Transaction');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateOrderNo, generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// ============================================
// Get All Orders
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, search, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } }
    ];
  }
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Order.countDocuments(filter)
  ]);

  sendPaginated(res, orders, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Order by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  sendSuccess(res, order);
});

// ============================================
// Create Order
// ============================================
const create = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, orderType, paymentMethod, notes, deliveryAddress } = req.body;

  if (!items?.length) throw new ApiError(400, 'Items required');

  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = await MenuItem.findOne({ _id: item.menuItemId, tenantId: req.tenant._id });
    if (!menuItem) throw new ApiError(404, `Menu item not found: ${item.menuItemId}`);
    if (!menuItem.available) throw new ApiError(400, `${menuItem.name} is not available`);

    const total = menuItem.price * item.quantity;
    subtotal += total;

    orderItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      totalPrice: total
    });
  }

  const count = await Order.countDocuments({ tenantId: req.tenant._id });
  const orderNumber = generateOrderNo('restaurant', count + 1);
  const totalAmount = subtotal - (req.body.discount || 0);

  const order = await Order.create({
    tenantId: req.tenant._id,
    orderNumber,
    customerName: customerName || 'Walk-in Customer',
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    items: orderItems,
    subtotal,
    discount: req.body.discount || 0,
    totalAmount,
    orderType: orderType || 'takeaway',
    paymentMethod: paymentMethod || 'Cash',
    paymentStatus: 'Pending',
    deliveryAddress: deliveryAddress || null,
    notes: notes || null,
    createdBy: req.user.id
  });

  // ✅ If order is paid immediately, create transaction
  if (req.body.paymentStatus === 'Paid' || req.body.payNow) {
    const transactionCount = await Transaction.countDocuments({ tenantId: req.tenant._id });
    const transactionId = generateReceiptNo('restaurant', transactionCount + 1);

    await Transaction.create({
      tenantId: req.tenant._id,
      transactionId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      items: orderItems,
      subtotal: order.subtotal,
      discount: order.discount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod || 'Cash',
      paymentStatus: 'Paid',
      notes: `Payment from order #${order.orderNumber}`,
      createdBy: req.user.id
    });

    order.paymentStatus = 'Paid';
    await order.save();
  }

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'order.created',
    module: 'resto',
    resource: 'Order',
    resourceId: order._id,
    details: { orderNumber, totalAmount }
  });

  // Send confirmation email
  if (customerEmail) {
    try {
      const templates = require('../../templates/restoEmailTemplates');
      const html = await templates.orderConfirmed({
        tenantId: req.tenant._id,
        name: customerName,
        orderNo: orderNumber,
        total: order.totalAmount,
        items: orderItems,
        estimatedTime: '30-45 minutes'
      });
      await emailService.send({
        to: customerEmail,
        subject: `Order #${orderNumber} Confirmed`,
        html
      });
    } catch (err) {
      logger.error('Failed to send order confirmation email:', err.message);
    }
  }

  sendSuccess(res, order, 'Order created', 201);
});

// ============================================
// Update Order Status
// ============================================
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid status');

  const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!order) throw new ApiError(404, 'Order not found');

  order.orderStatus = status;
  await order.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: `order.status_${status.toLowerCase()}`,
    module: 'resto',
    resource: 'Order',
    resourceId: order._id,
    details: { orderNumber: order.orderNumber, status }
  });

  // Send email notification for status change
  if (order.customerEmail && ['Confirmed', 'Ready', 'Completed'].includes(status)) {
    try {
      const templates = require('../../templates/restoEmailTemplates');
      let html;
      if (status === 'Confirmed') {
        html = await templates.orderConfirmed({
          tenantId: req.tenant._id,
          name: order.customerName,
          orderNo: order.orderNumber,
          total: order.totalAmount,
          items: order.items
        });
      } else if (status === 'Ready') {
        html = await templates.orderReady({
          tenantId: req.tenant._id,
          name: order.customerName,
          orderNo: order.orderNumber
        });
      }
      if (html) {
        await emailService.send({
          to: order.customerEmail,
          subject: `Order #${order.orderNumber} ${status}`,
          html
        });
      }
    } catch (err) {
      logger.error('Failed to send status update email:', err.message);
    }
  }

  sendSuccess(res, order, `Order status updated to ${status}`);
});

// ============================================
// Confirm Payment - Creates Transaction
// ============================================
const confirmPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.paymentStatus === 'Paid') {
    throw new ApiError(400, 'Order already paid');
  }

  // ✅ Create transaction record
  const transactionCount = await Transaction.countDocuments({ tenantId: req.tenant._id });
  const transactionId = generateReceiptNo('restaurant', transactionCount + 1);

  await Transaction.create({
    tenantId: req.tenant._id,
    transactionId,
    orderId: order._id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    items: order.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod || 'Cash',
    paymentStatus: 'Paid',
    notes: `Payment from order #${order.orderNumber}`,
    createdBy: req.user.id
  });

  order.paymentStatus = 'Paid';
  await order.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'order.payment_confirmed',
    module: 'resto',
    resource: 'Order',
    resourceId: order._id,
    details: { orderNumber: order.orderNumber, amount: order.totalAmount }
  });

  // Send receipt email
  if (order.customerEmail) {
    try {
      const templates = require('../../templates/restoEmailTemplates');
      const saleData = order.toObject();
      saleData.receiptNumber = transactionId;
      saleData.items = order.items;

      const html = await templates.saleInvoice({
        tenantId: req.tenant._id,
        sale: saleData
      });
      await emailService.send({
        to: order.customerEmail,
        subject: `Receipt #${transactionId}`,
        html
      });
    } catch (err) {
      logger.error('Failed to send receipt email:', err.message);
    }
  }

  sendSuccess(res, order, 'Payment confirmed');
});

// ============================================
// Cancel Order
// ============================================
const cancel = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.orderStatus === 'Completed') throw new ApiError(400, 'Cannot cancel completed order');

  order.orderStatus = 'Cancelled';
  await order.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'order.cancelled',
    module: 'resto',
    resource: 'Order',
    resourceId: order._id,
    details: { orderNumber: order.orderNumber }
  });

  sendSuccess(res, order, 'Order cancelled');
});

// ============================================
// Dispatch Order
// ============================================
const dispatch = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.orderStatus !== 'Completed') throw new ApiError(400, 'Order must be completed before dispatch');

  order.orderStatus = 'Dispatched';
  await order.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'order.dispatched',
    module: 'resto',
    resource: 'Order',
    resourceId: order._id,
    details: { orderNumber: order.orderNumber }
  });

  sendSuccess(res, order, 'Order dispatched');
});

// ============================================
// Get Order Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, todayOrders, byStatus, todayRevenue, totalRevenue] = await Promise.all([
    Order.countDocuments({ tenantId }),
    Order.countDocuments({ tenantId, createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]),
    Transaction.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: today }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Transaction.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  sendSuccess(res, {
    total,
    todayOrders,
    byStatus,
    todayRevenue: todayRevenue[0]?.total || 0,
    totalRevenue: totalRevenue[0]?.total || 0
  });
});

module.exports = { getAll, getById, create, updateStatus, confirmPayment, cancel, dispatch, getStats };