const ApartmentTenant = require('../../models/apartment/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id, isActive: true };
  if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { phone: { $regex: req.query.search, $options: 'i' } }];
  const tenants = await ApartmentTenant.find(filter).sort({ name: 1 }).lean();
  sendSuccess(res, tenants);
});

const getById = asyncHandler(async (req, res) => {
  const tenant = await ApartmentTenant.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  sendSuccess(res, tenant);
});

const create = asyncHandler(async (req, res) => {
  const tenant = await ApartmentTenant.create({ ...req.body, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'occupant.created', module: 'apartment', resource: 'ApartmentTenant', resourceId: tenant._id });
  sendSuccess(res, tenant, 'Tenant created', 201);
});

const update = asyncHandler(async (req, res) => {
  const tenant = await ApartmentTenant.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  sendSuccess(res, tenant, 'Tenant updated');
});

const remove = asyncHandler(async (req, res) => {
  await ApartmentTenant.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Tenant deleted');
});

module.exports = { getAll, getById, create, update, remove };