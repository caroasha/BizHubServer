const Medicine = require('../../models/pharma/Medicine');
const MedicineCategory = require('../../models/pharma/MedicineCategory');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, categoryId, search, lowStock, expiring } = req.query;
  const skip = (page - 1) * limit;
  const tenantId = req.tenant._id;

  const filter = { tenantId, isActive: true };
  if (categoryId) filter.categoryId = categoryId;
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStockAlert'] };
  if (expiring === 'true') filter.expiryDate = { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };

  const [medicines, total] = await Promise.all([
    Medicine.find(filter).populate('categoryId', 'name').sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Medicine.countDocuments(filter),
  ]);

  sendPaginated(res, medicines, {
    page: parseInt(page), limit: parseInt(limit),
    totalPages: Math.ceil(total / limit), totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({ _id: req.params.id, tenantId: req.tenant._id }).populate('categoryId', 'name').lean();
  if (!medicine) throw new ApiError(404, 'Medicine not found');
  sendSuccess(res, medicine);
});

const create = asyncHandler(async (req, res) => {
  const medicine = await Medicine.create({ ...req.body, tenantId: req.tenant._id, createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine.created', module: 'pharma', resource: 'Medicine', resourceId: medicine._id });
  sendSuccess(res, medicine, 'Medicine created', 201);
});

const update = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!medicine) throw new ApiError(404, 'Medicine not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine.updated', module: 'pharma', resource: 'Medicine', resourceId: medicine._id });
  sendSuccess(res, medicine, 'Medicine updated');
});

const remove = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!medicine) throw new ApiError(404, 'Medicine not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine.deleted', module: 'pharma', resource: 'Medicine', resourceId: medicine._id });
  sendSuccess(res, null, 'Medicine deleted');
});

const adjustStock = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  const medicine = await Medicine.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!medicine) throw new ApiError(404, 'Medicine not found');

  medicine.stock += quantity;
  if (medicine.stock < 0) throw new ApiError(400, 'Insufficient stock');
  await medicine.save();

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine.stock_adjusted', module: 'pharma', resource: 'Medicine', resourceId: medicine._id, details: { quantity, reason, newStock: medicine.stock } });
  sendSuccess(res, medicine, 'Stock adjusted');
});

module.exports = { getAll, getById, create, update, remove, adjustStock };