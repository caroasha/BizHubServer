const Transaction = require('../../models/resto/Transaction');
const MenuItem = require('../../models/resto/MenuItem');
const Customer = require('../../models/resto/Customer');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// ============================================
// Get All Transactions
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, startDate, endDate, paymentStatus, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (paymentStatus) {
    const statuses = paymentStatus.split(',');
    filter.paymentStatus = { $in: statuses };
  }
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (search) {
    filter.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } }
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Transaction.countDocuments(filter)
  ]);

  sendPaginated(res, transactions, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Transaction by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  sendSuccess(res, transaction);
});

// ============================================
// Create Transaction (POS Sale)
// ============================================
const create = asyncHandler(async (req, res) => {
  const { items, customerName, customerPhone, customerEmail, paymentMethod, discount, notes } = req.body;

  if (!items?.length) throw new ApiError(400, 'Items required');

  let subtotal = 0;
  const transactionItems = [];

  for (const item of items) {
    const menuItem = await MenuItem.findOne({ _id: item.menuItemId, tenantId: req.tenant._id });
    if (!menuItem) throw new ApiError(404, `Menu item not found: ${item.menuItemId}`);

    const total = menuItem.price * item.quantity;
    subtotal += total;

    transactionItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      totalPrice: total
    });
  }

  const count = await Transaction.countDocuments({ tenantId: req.tenant._id });
  const transactionId = generateReceiptNo('restaurant', count + 1);
  const totalAmount = subtotal - (discount || 0);

  const transaction = await Transaction.create({
    tenantId: req.tenant._id,
    transactionId,
    customerName: customerName || 'Walk-in Customer',
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
    items: transactionItems,
    subtotal,
    discount: discount || 0,
    totalAmount,
    paymentMethod: paymentMethod || 'Cash',
    paymentStatus: 'Paid',
    notes: notes || null,
    createdBy: req.user.id
  });

  // Update customer stats
  if (customerPhone) {
    const customer = await Customer.findOne({ tenantId: req.tenant._id, phone: customerPhone });
    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent += totalAmount;
      customer.lastOrderDate = new Date();
      await customer.save();
    }
  }

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'transaction.created',
    module: 'resto',
    resource: 'Transaction',
    resourceId: transaction._id,
    details: { transactionId, totalAmount }
  });

  // Send receipt email
  if (customerEmail) {
    try {
      const templates = require('../../templates/restoEmailTemplates');
      const html = await templates.saleInvoice({
        tenantId: req.tenant._id,
        sale: { ...transaction.toObject(), items: transactionItems }
      });
      await emailService.send({
        to: customerEmail,
        subject: `Receipt #${transactionId}`,
        html
      });
    } catch (err) {
      logger.error('Failed to send receipt email:', err.message);
    }
  }

  sendSuccess(res, transaction, 'Sale completed', 201);
});

// ============================================
// Get Transaction Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todaySales, todayRevenue, monthSales, monthRevenue, totalRevenue] = await Promise.all([
    Transaction.countDocuments({ tenantId, createdAt: { $gte: today }, paymentStatus: 'Paid' }),
    Transaction.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: today }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Transaction.countDocuments({ tenantId, createdAt: { $gte: thisMonth }, paymentStatus: 'Paid' }),
    Transaction.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Transaction.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  sendSuccess(res, {
    todaySales,
    todayRevenue: todayRevenue[0]?.total || 0,
    monthSales,
    monthRevenue: monthRevenue[0]?.total || 0,
    totalRevenue: totalRevenue[0]?.total || 0
  });
});

// ============================================
// Print Receipt (Returns receipt data)
// ============================================
const printReceipt = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  sendSuccess(res, transaction);
});

module.exports = { getAll, getById, create, getStats, printReceipt };