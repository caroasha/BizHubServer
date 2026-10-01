const Supplier = require('../../models/pharma/Supplier');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, suppliers);
});

const getById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  sendSuccess(res, supplier);
});

const create = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'supplier.created', module: 'pharma', resource: 'Supplier', resourceId: supplier._id });
  sendSuccess(res, supplier, 'Supplier created', 201);
});

const update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'supplier.updated', module: 'pharma', resource: 'Supplier', resourceId: supplier._id });
  sendSuccess(res, supplier, 'Supplier updated');
});

const remove = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false }, { new: true });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'supplier.deleted', module: 'pharma', resource: 'Supplier', resourceId: supplier._id });
  sendSuccess(res, null, 'Supplier deleted');
});

module.exports = { getAll, getById, create, update, remove };