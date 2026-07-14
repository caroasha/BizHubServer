const Expense = require('../../models/resto/Expense');
const Supplier = require('../../models/resto/Supplier');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');

// ============================================
// Get All Expenses
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, startDate, endDate, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (type) filter.type = type;
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: 'i' } },
      { expenseId: { $regex: search, $options: 'i' } }
    ];
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Expense.countDocuments(filter)
  ]);

  sendPaginated(res, expenses, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Expense by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!expense) throw new ApiError(404, 'Expense not found');
  sendSuccess(res, expense);
});

// ============================================
// Create Expense
// ============================================
const create = asyncHandler(async (req, res) => {
  const { type, description, amount, paymentMethod, supplierId, notes } = req.body;

  if (!type || !description || !amount) {
    throw new ApiError(400, 'Type, description and amount are required');
  }

  const count = await Expense.countDocuments({ tenantId: req.tenant._id });
  const expenseId = generateReceiptNo('expense', count + 1);

  const expense = await Expense.create({
    tenantId: req.tenant._id,
    expenseId,
    type,
    description,
    amount,
    paymentMethod: paymentMethod || 'Cash',
    supplierId: supplierId || null,
    notes: notes || null,
    createdBy: req.user.id
  });

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'expense.created',
    module: 'resto',
    resource: 'Expense',
    resourceId: expense._id,
    details: { expenseId, amount, type }
  });

  sendSuccess(res, expense, 'Expense recorded', 201);
});

// ============================================
// Delete Expense
// ============================================
const remove = asyncHandler(async (req, res) => {
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, tenantId: req.tenant._id });
  if (!expense) throw new ApiError(404, 'Expense not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'expense.deleted',
    module: 'resto',
    resource: 'Expense',
    resourceId: req.params.id
  });

  sendSuccess(res, null, 'Expense deleted');
});

// ============================================
// Get Expense Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayExpenses, monthExpenses, totalExpenses, byType] = await Promise.all([
    Expense.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  sendSuccess(res, {
    today: { total: todayExpenses[0]?.total || 0, count: todayExpenses[0]?.count || 0 },
    month: { total: monthExpenses[0]?.total || 0, count: monthExpenses[0]?.count || 0 },
    total: { total: totalExpenses[0]?.total || 0, count: totalExpenses[0]?.count || 0 },
    byType
  });
});

module.exports = { getAll, getById, create, remove, getStats };