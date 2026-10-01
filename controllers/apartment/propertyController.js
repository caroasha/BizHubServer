const Property = require('../../models/apartment/Property');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const properties = await Property.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, properties);
});

const getById = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!property) throw new ApiError(404, 'Property not found');
  sendSuccess(res, property);
});

const create = asyncHandler(async (req, res) => {
  const property = await Property.create({ ...req.body, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'property.created', module: 'apartment', resource: 'Property', resourceId: property._id });
  sendSuccess(res, property, 'Property created', 201);
});

const update = asyncHandler(async (req, res) => {
  const property = await Property.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!property) throw new ApiError(404, 'Property not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'property.updated', module: 'apartment', resource: 'Property', resourceId: property._id });
  sendSuccess(res, property, 'Property updated');
});

const remove = asyncHandler(async (req, res) => {
  await Property.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Property deleted');
});

module.exports = { getAll, getById, create, update, remove };