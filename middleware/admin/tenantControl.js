const ApiError = require('../../utils/ApiError');
const Tenant = require('../../models/admin/Tenant');

const getId = (req) => req.params.id || req.params.tenantId;

const canSuspend = async (req, res, next) => {
  const id = getId(req);
  const tenant = await Tenant.findOne({ _id: id });
  if (!tenant) return next(new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND'));
  if (tenant.status === 'suspended') return next(new ApiError(400, 'Tenant is already suspended', 'ALREADY_SUSPENDED'));
  req.targetTenant = tenant;
  next();
};

const canUpgrade = async (req, res, next) => {
  const id = getId(req);
  const { plan } = req.body;
  if (!plan) return next(new ApiError(400, 'Plan is required', 'PLAN_REQUIRED'));
  const tenant = await Tenant.findOne({ _id: id });
  if (!tenant) return next(new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND'));
  req.targetTenant = tenant;
  next();
};

const canDelete = async (req, res, next) => {
  const id = getId(req);
  const tenant = await Tenant.findOne({ _id: id });
  if (!tenant) return next(new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND'));
  req.targetTenant = tenant;
  next();
};

module.exports = { canSuspend, canUpgrade, canDelete };