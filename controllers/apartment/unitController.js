const Unit = require('../../models/apartment/Unit');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id, isActive: true };
  if (req.query.propertyId) filter.propertyId = req.query.propertyId;
  if (req.query.status) filter.status = req.query.status;
  const units = await Unit.find(filter).populate('propertyId', 'name').sort({ number: 1 }).lean();
  sendSuccess(res, units);
});

const getById = asyncHandler(async (req, res) => {
  const unit = await Unit.findOne({ _id: req.params.id, tenantId: req.tenant._id }).populate('propertyId', 'name').lean();
  if (!unit) throw new ApiError(404, 'Unit not found');
  sendSuccess(res, unit);
});

const create = asyncHandler(async (req, res) => {
  const unit = await Unit.create({ ...req.body, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'unit.created', module: 'apartment', resource: 'Unit', resourceId: unit._id });
  sendSuccess(res, unit, 'Unit created', 201);
});

const update = asyncHandler(async (req, res) => {
  const unit = await Unit.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!unit) throw new ApiError(404, 'Unit not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'unit.updated', module: 'apartment', resource: 'Unit', resourceId: unit._id });
  sendSuccess(res, unit, 'Unit updated');
});

const remove = asyncHandler(async (req, res) => {
  await Unit.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Unit deleted');
});

module.exports = { getAll, getById, create, update, remove };