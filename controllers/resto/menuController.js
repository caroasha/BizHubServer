const MenuItem = require('../../models/resto/MenuItem');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

// ============================================
// Get All Menu Items
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, search, available } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id, isActive: true };
  
  if (category) filter.category = category;
  if (available !== undefined) filter.available = available === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  const [items, total] = await Promise.all([
    MenuItem.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    MenuItem.countDocuments(filter)
  ]);
  
  sendPaginated(res, items, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Available Menu Items (For Customer Portal)
// ============================================
const getAvailable = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({
    tenantId: req.tenant._id,
    isActive: true,
    available: true
  }).sort({ category: 1, name: 1 }).lean();
  
  sendSuccess(res, items);
});

// ============================================
// Get Menu Item by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const item = await MenuItem.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!item) throw new ApiError(404, 'Menu item not found');
  sendSuccess(res, item);
});

// ============================================
// Create Menu Item
// ============================================
const create = asyncHandler(async (req, res) => {
  const item = await MenuItem.create({
    ...req.body,
    tenantId: req.tenant._id,
    createdBy: req.user.id
  });
  sendSuccess(res, item, 'Menu item created', 201);
});

// ============================================
// Update Menu Item
// ============================================
const update = asyncHandler(async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { ...req.body, updatedBy: req.user.id },
    { new: true, runValidators: true }
  );
  if (!item) throw new ApiError(404, 'Menu item not found');
  sendSuccess(res, item, 'Menu item updated');
});

// ============================================
// Delete Menu Item (Soft Delete)
// ============================================
const remove = asyncHandler(async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!item) throw new ApiError(404, 'Menu item not found');
  sendSuccess(res, null, 'Menu item deleted');
});

// ============================================
// Toggle Menu Item Availability
// ============================================
const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await MenuItem.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!item) throw new ApiError(404, 'Menu item not found');
  
  item.available = !item.available;
  item.updatedBy = req.user.id;
  await item.save();
  
  sendSuccess(res, { available: item.available }, `Menu item ${item.available ? 'available' : 'unavailable'}`);
});

// ============================================
// Get Menu Categories
// ============================================
const getCategories = asyncHandler(async (req, res) => {
  const categories = await MenuItem.distinct('category', { tenantId: req.tenant._id, isActive: true });
  sendSuccess(res, categories.sort());
});

// ============================================
// Get Menu Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const [total, available, unavailable, byCategory] = await Promise.all([
    MenuItem.countDocuments({ tenantId: req.tenant._id, isActive: true }),
    MenuItem.countDocuments({ tenantId: req.tenant._id, isActive: true, available: true }),
    MenuItem.countDocuments({ tenantId: req.tenant._id, isActive: true, available: false }),
    MenuItem.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(req.tenant._id), isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
  ]);
  
  sendSuccess(res, { total, available, unavailable, byCategory });
});

module.exports = { getAll, getAvailable, getById, create, update, remove, toggleAvailability, getCategories, getStats };