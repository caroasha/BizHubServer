const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const jwt = require('../../utils/jwt');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const templates = require('../../templates/emailTemplates');
const smsTemplates = require('../../templates/smsTemplates');

const modelNames = {
  restaurant: 'RestoUser',
  pharmacy: 'PharmaUser',
  apartment: 'ApartmentUser',
  electronics: 'ElectroUser',
  cyber: 'CyberUser',
};

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

const login = asyncHandler(async (req, res) => {
  const { email, password, phone } = req.body;
  if (!email && !phone) throw new ApiError(400, 'Email or phone required');
  if (!password) throw new ApiError(400, 'Password required');

  // Find all tenants for this email
  const tenants = await Tenant.find({
    $or: [
      { 'owner.email': email },
      { 'contact.email': email },
      { 'owner.phone': phone },
      { 'contact.phone': phone },
    ],
  });

  if (!tenants || tenants.length === 0) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  // Check if any tenant is blocked
  const blockedTenant = tenants.find(t => t.status === 'pending' || t.status === 'suspended');
  if (blockedTenant && tenants.length === 1) {
    if (blockedTenant.status === 'pending') throw new ApiError(403, 'Your account is pending approval. We will notify you once it is activated.', 'ACCOUNT_PENDING');
    if (blockedTenant.status === 'suspended') throw new ApiError(403, 'Your account has been suspended. Please contact support for assistance.', 'ACCOUNT_SUSPENDED');
  }

  // Use the first active tenant for auth, or first tenant if none active
  let activeTenant = tenants.find(t => t.status === 'active' || t.status === 'trial');
  if (!activeTenant) activeTenant = tenants[0];

  const User = getUserModel(activeTenant.businessType);
  const user = await User.findOne({
    tenantId: activeTenant._id,
    $or: [{ email: email || '' }, { phone: phone || '' }],
  }).select('+password');

  if (!user) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated. Please contact support.', 'ACCOUNT_DEACTIVATED');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

  user.lastLogin = new Date();
  await user.save();

  const accessToken = jwt.signAccessToken({ id: user._id, tenantId: activeTenant._id, role: user.role });
  const refreshToken = jwt.signRefreshToken({ id: user._id, tenantId: activeTenant._id });

  // Get all active modules for this user
  const allModules = tenants
    .filter(t => t.status === 'active' || t.status === 'trial')
    .map(t => t.businessType);

  await AuditLog.create({
    tenantId: activeTenant._id, userId: user._id,
    userModel: modelNames[activeTenant.businessType] || `${activeTenant.businessType}User`,
    action: 'user.login', module: activeTenant.businessType, ipAddress: req.ip,
  });

  sendSuccess(res, {
    user: {
      id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, tenantId: activeTenant._id,
      businessName: activeTenant.businessName, businessType: activeTenant.businessType,
      modules: allModules,
    },
    tenant: {
      id: activeTenant._id, businessName: activeTenant.businessName,
      businessType: activeTenant.businessType, slug: activeTenant.slug,
      status: activeTenant.status, contact: activeTenant.contact,
      owner: activeTenant.owner, settings: activeTenant.settings,
    },
    modules: allModules,
    accessToken, refreshToken,
  }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  sendSuccess(res, null, 'Logout successful');
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token required');
  const decoded = jwt.verifyRefreshToken(refreshToken);
  const accessToken = jwt.signAccessToken({ id: decoded.id, tenantId: decoded.tenantId, role: decoded.role });
  sendSuccess(res, { accessToken }, 'Token refreshed');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  if (!email && !phone) throw new ApiError(400, 'Email or phone required');

  const tenant = await Tenant.findOne({
    $or: [
      { 'owner.email': email }, { 'contact.email': email },
      { 'owner.phone': phone }, { 'contact.phone': phone },
    ],
  });

  if (!tenant) return sendSuccess(res, null, 'If account exists, reset instructions sent');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({
    tenantId: tenant._id,
    $or: [{ email: email || '' }, { phone: phone || '' }],
  });

  if (!user) return sendSuccess(res, null, 'If account exists, reset instructions sent');

  const resetToken = jwt.signAccessToken({ id: user._id, tenantId: tenant._id });

  if (email) {
    const html = await templates.passwordReset({ name: user.name, token: resetToken });
    await emailService.send({ to: email, subject: 'Reset Your Password - BizHub', html });
  }

  if (phone) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await smsService.send({ to: phone, message: smsTemplates.otpPasswordReset({ code: otp }) });
  }

  sendSuccess(res, null, 'Reset instructions sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new ApiError(400, 'Token and new password required');

  const decoded = jwt.verifyAccessToken(token);
  const tenant = await Tenant.findById(decoded.tenantId);
  if (!tenant) throw new ApiError(400, 'Invalid token');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({ _id: decoded.id, tenantId: decoded.tenantId }).select('+password');
  if (!user) throw new ApiError(400, 'Invalid token');

  user.password = newPassword;
  await user.save();

  const html = await templates.passwordChanged({ name: user.name });
  await emailService.send({ to: user.email || tenant.owner.email, subject: 'Password Changed - BizHub', html });

  sendSuccess(res, null, 'Password reset successful');
});

module.exports = { login, logout, refreshToken, forgotPassword, resetPassword };