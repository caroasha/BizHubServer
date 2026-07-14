const Module = require('../../models/admin/Module');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');

const getByTenant = asyncHandler(async (req, res) => {
  const modules = await Module.find({ tenantId: req.params.tenantId }).lean();
  sendSuccess(res, modules);
});

const enable = asyncHandler(async (req, res) => {
  const { tenantId, moduleName } = req.body;
  if (!tenantId || !moduleName) throw new ApiError(400, 'Tenant ID and module name required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const module = await Module.findOneAndUpdate(
    { tenantId, moduleName },
    { status: 'active', activatedAt: new Date() },
    { new: true, upsert: true }
  );

  await AuditLog.create({
    tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'module.enabled',
    module: 'admin',
    resource: 'Module',
    resourceId: module._id,
    details: { moduleName },
  });

  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.send({
      to: tenant.contact?.email || tenant.owner.email,
      subject: `Module Activated - ${tenant.businessName}`,
      html: `<p>Hello ${tenant.owner.name},</p><p>The <strong>${moduleName}</strong> module has been activated for your account. Login to start using it.</p>`,
    });
  }

  sendSuccess(res, module, 'Module enabled');
});

const disable = asyncHandler(async (req, res) => {
  const { tenantId, moduleName } = req.body;
  if (!tenantId || !moduleName) throw new ApiError(400, 'Tenant ID and module name required');

  const module = await Module.findOneAndUpdate(
    { tenantId, moduleName },
    { status: 'inactive' },
    { new: true }
  );

  if (!module) throw new ApiError(404, 'Module not found', 'MODULE_NOT_FOUND');

  await AuditLog.create({
    tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'module.disabled',
    module: 'admin',
    resource: 'Module',
    resourceId: module._id,
    details: { moduleName },
  });

  sendSuccess(res, module, 'Module disabled');
});

const updateFeatures = asyncHandler(async (req, res) => {
  const { tenantId, moduleName, features } = req.body;
  if (!tenantId || !moduleName || !features) throw new ApiError(400, 'Tenant ID, module name, and features required');

  const module = await Module.findOne({ tenantId, moduleName });
  if (!module) throw new ApiError(404, 'Module not found', 'MODULE_NOT_FOUND');

  module.features = { ...module.features, ...features };
  await module.save();

  await AuditLog.create({
    tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'module.features_updated',
    module: 'admin',
    resource: 'Module',
    resourceId: module._id,
    details: { moduleName, features },
  });

  sendSuccess(res, module, 'Features updated');
});

module.exports = { getByTenant, enable, disable, updateFeatures };