const MedicineCategory = require('../../models/pharma/MedicineCategory');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const categories = await MedicineCategory.find({ tenantId: req.tenant._id, isActive: true }).sort({ sortOrder: 1 }).lean();
  sendSuccess(res, categories);
});

const create = asyncHandler(async (req, res) => {
  const category = await MedicineCategory.create({ ...req.body, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine_category.created', module: 'pharma', resource: 'MedicineCategory', resourceId: category._id });
  sendSuccess(res, category, 'Category created', 201);
});

const update = asyncHandler(async (req, res) => {
  const category = await MedicineCategory.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!category) throw new ApiError(404, 'Category not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine_category.updated', module: 'pharma', resource: 'MedicineCategory', resourceId: category._id });
  sendSuccess(res, category, 'Category updated');
});

const remove = asyncHandler(async (req, res) => {
  const category = await MedicineCategory.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false }, { new: true });
  if (!category) throw new ApiError(404, 'Category not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'medicine_category.deleted', module: 'pharma', resource: 'MedicineCategory', resourceId: category._id });
  sendSuccess(res, null, 'Category deleted');
});

module.exports = { getAll, create, update, remove };