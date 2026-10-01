const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');

const getUserModel = (businessType) => {
  const models = {
    restaurant: require('../../models/resto/User'),
    pharmacy: require('../../models/pharma/User'),
    apartment: require('../../models/apartment/User'),
    electronics: require('../../models/electro/User'),
    cyber: require('../../models/cyber/User'),
  };
  return models[businessType];
};

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, tenantId, role, status } = req.query;
  const skip = (page - 1) * limit;

  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  if (!User) throw new ApiError(400, 'Invalid business type');

  const filter = { tenantId };
  if (role) filter.role = role;
  if (status) filter.isActive = status === 'active';

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -pin').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(filter),
  ]);

  sendPaginated(res, users, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({ _id: req.params.id, tenantId }).select('-password -pin').lean();
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  sendSuccess(res, user);
});

const disable = asyncHandler(async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({ _id: req.params.id, tenantId });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  user.isActive = false;
  await user.save();

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'user.disabled',
    module: 'admin',
    resource: 'User',
    resourceId: user._id,
    details: { tenantId },
  });

  if (user.email) {
    await emailService.send({
      to: user.email,
      subject: `Account Deactivated - ${tenant.businessName}`,
      html: require('../../templates/emailTemplates').accountSuspended({
        name: user.name,
        businessName: tenant.businessName,
        reason: 'Deactivated by admin',
      }),
    });
  }

  sendSuccess(res, user, 'User disabled');
});

const enable = asyncHandler(async (req, res) => {
  const { tenantId } = req.body;
  if (!tenantId) throw new ApiError(400, 'Tenant ID required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({ _id: req.params.id, tenantId });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  user.isActive = true;
  await user.save();

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'user.enabled',
    module: 'admin',
    resource: 'User',
    resourceId: user._id,
    details: { tenantId },
  });

  if (user.email) {
    await emailService.send({
      to: user.email,
      subject: `Account Reactivated - ${tenant.businessName}`,
      html: require('../../templates/emailTemplates').accountReactivated({
        name: user.name,
        businessName: tenant.businessName,
      }),
    });
  }

  sendSuccess(res, user, 'User enabled');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { tenantId, newPassword } = req.body;
  if (!tenantId || !newPassword) throw new ApiError(400, 'Tenant ID and new password required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({ _id: req.params.id, tenantId });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  user.password = newPassword;
  await user.save();

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'user.password_reset',
    module: 'admin',
    resource: 'User',
    resourceId: user._id,
    details: { tenantId },
  });

  sendSuccess(res, null, 'Password reset successful');
});

module.exports = { getAll, getById, disable, enable, resetPassword };