const Ingredient = require('../../models/resto/Ingredient');
const Supplier = require('../../models/resto/Supplier');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

// ============================================
// Get All Stock Items
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, status, search, lowStock } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id, isActive: true };

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (lowStock === 'true') {
    filter.$expr = { $lte: ['$stock', '$minStockAlert'] };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { supplier: { $regex: search, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    Ingredient.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Ingredient.countDocuments(filter)
  ]);

  sendPaginated(res, items, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Stock Item by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const item = await Ingredient.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!item) throw new ApiError(404, 'Stock item not found');
  sendSuccess(res, item);
});

// ============================================
// Get Low Stock Items
// ============================================
const getLowStock = asyncHandler(async (req, res) => {
  const items = await Ingredient.find({
    tenantId: req.tenant._id,
    isActive: true,
    $expr: { $lte: ['$stock', '$minStockAlert'] }
  }).sort({ stock: 1 }).lean();

  sendSuccess(res, items);
});

// ============================================
// Get Expiring Soon Items
// ============================================
const getExpiringSoon = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + parseInt(days));

  const items = await Ingredient.find({
    tenantId: req.tenant._id,
    isActive: true,
    expiryDate: { $lte: expiryDate, $ne: null }
  }).sort({ expiryDate: 1 }).lean();

  sendSuccess(res, items);
});

// ============================================
// Create Stock Item
// ============================================
const create = asyncHandler(async (req, res) => {
  const { name, category, unit, stock, minStockAlert, costPerUnit, sellingPrice, supplier, batchNo, expiryDate, description } = req.body;

  if (!name || !category) {
    throw new ApiError(400, 'Name and category are required');
  }

  const existing = await Ingredient.findOne({
    tenantId: req.tenant._id,
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });
  if (existing) throw new ApiError(400, 'Stock item with this name already exists');

  const item = await Ingredient.create({
    tenantId: req.tenant._id,
    name,
    category,
    unit: unit || 'kg',
    stock: stock || 0,
    minStockAlert: minStockAlert || 5,
    costPerUnit: costPerUnit || 0,
    sellingPrice: sellingPrice || 0,
    supplier: supplier || null,
    batchNo: batchNo || null,
    expiryDate: expiryDate || null,
    description: description || null,
    createdBy: req.user.id
  });

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'stock.created',
    module: 'resto',
    resource: 'Ingredient',
    resourceId: item._id
  });

  sendSuccess(res, item, 'Stock item added', 201);
});

// ============================================
// Update Stock Item
// ============================================
const update = asyncHandler(async (req, res) => {
  const item = await Ingredient.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { ...req.body, updatedBy: req.user.id },
    { new: true, runValidators: true }
  );
  if (!item) throw new ApiError(404, 'Stock item not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'stock.updated',
    module: 'resto',
    resource: 'Ingredient',
    resourceId: item._id
  });

  sendSuccess(res, item, 'Stock item updated');
});

// ============================================
// Delete Stock Item (Soft Delete)
// ============================================
const remove = asyncHandler(async (req, res) => {
  const item = await Ingredient.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!item) throw new ApiError(404, 'Stock item not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'stock.deleted',
    module: 'resto',
    resource: 'Ingredient',
    resourceId: item._id
  });

  sendSuccess(res, null, 'Stock item deleted');
});

// ============================================
// Record Stock Usage (Reduce Stock)
// ============================================
const recordUsage = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, 'Valid quantity required');
  }
  if (!reason) throw new ApiError(400, 'Reason for usage is required');

  const item = await Ingredient.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!item) throw new ApiError(404, 'Stock item not found');

  if (item.stock < quantity) {
    throw new ApiError(400, `Insufficient stock. Available: ${item.stock}, Requested: ${quantity}`);
  }

  item.stock -= quantity;

  // Auto-update status
  if (item.stock <= 0) {
    item.status = 'Out of Stock';
  } else if (item.stock <= item.minStockAlert) {
    item.status = 'Low Stock';
  } else {
    item.status = 'In Stock';
  }

  await item.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'stock.usage_recorded',
    module: 'resto',
    resource: 'Ingredient',
    resourceId: item._id,
    details: { quantity, reason, newStock: item.stock }
  });

  sendSuccess(res, item, `Stock usage recorded. New stock: ${item.stock} ${item.unit}`);
});

// ============================================
// Add Stock (Restock)
// ============================================
const addStock = asyncHandler(async (req, res) => {
  const { quantity, costPerUnit, batchNo, expiryDate } = req.body;

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, 'Valid quantity required');
  }

  const item = await Ingredient.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!item) throw new ApiError(404, 'Stock item not found');

  item.stock += quantity;
  if (costPerUnit) item.costPerUnit = costPerUnit;
  if (batchNo) item.batchNo = batchNo;
  if (expiryDate) item.expiryDate = expiryDate;

  // Update status
  if (item.stock > item.minStockAlert) {
    item.status = 'In Stock';
  }

  item.updatedBy = req.user.id;
  await item.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'stock.restocked',
    module: 'resto',
    resource: 'Ingredient',
    resourceId: item._id,
    details: { quantity, newStock: item.stock }
  });

  sendSuccess(res, item, `Stock updated. New stock: ${item.stock} ${item.unit}`);
});

// ============================================
// Get Stock Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;

  const [total, lowStock, outOfStock, byCategory, totalValue] = await Promise.all([
    Ingredient.countDocuments({ tenantId, isActive: true }),
    Ingredient.countDocuments({
      tenantId,
      isActive: true,
      $expr: { $lte: ['$stock', '$minStockAlert'] },
      stock: { $gt: 0 }
    }),
    Ingredient.countDocuments({ tenantId, isActive: true, stock: 0 }),
    Ingredient.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    Ingredient.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$stock', '$costPerUnit'] } } } }
    ])
  ]);

  sendSuccess(res, {
    total,
    lowStock,
    outOfStock,
    byCategory,
    totalValue: totalValue[0]?.total || 0
  });
});

module.exports = {
  getAll,
  getById,
  getLowStock,
  getExpiringSoon,
  create,
  update,
  remove,
  recordUsage,
  addStock,
  getStats
};