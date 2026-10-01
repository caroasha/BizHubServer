const Admin = require('../../models/admin/Admin');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const jwt = require('../../utils/jwt');
const emailService = require('../../services/emailService');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  if (!admin.isActive) throw new ApiError(403, 'Account deactivated', 'ACCOUNT_DEACTIVATED');

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

  admin.lastLogin = new Date();
  await admin.save();

  const accessToken = jwt.signAccessToken({ id: admin._id, role: admin.role });
  const refreshToken = jwt.signRefreshToken({ id: admin._id });

  await AuditLog.create({
    userId: admin._id,
    userModel: 'Admin',
    action: 'admin.login',
    module: 'admin',
    ipAddress: req.ip,
  });

  sendSuccess(res, {
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    accessToken,
    refreshToken,
  }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'admin.logout',
    module: 'admin',
    ipAddress: req.ip,
  });

  sendSuccess(res, null, 'Logout successful');
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token required');

  const decoded = jwt.verifyRefreshToken(refreshToken);
  const admin = await Admin.findById(decoded.id);
  if (!admin) throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');

  const accessToken = jwt.signAccessToken({ id: admin._id, role: admin.role });

  sendSuccess(res, { accessToken }, 'Token refreshed');
});

const getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, req.admin);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const admin = await Admin.findById(req.admin._id);

  if (name) admin.name = name;
  if (phone) admin.phone = phone;
  if (avatar) admin.avatar = avatar;
  await admin.save();

  await AuditLog.create({
    userId: admin._id,
    userModel: 'Admin',
    action: 'admin.profile_updated',
    module: 'admin',
  });

  sendSuccess(res, admin, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password required');

  const admin = await Admin.findById(req.admin._id).select('+password');
  const isMatch = await admin.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

  admin.password = newPassword;
  await admin.save();

  await AuditLog.create({
    userId: admin._id,
    userModel: 'Admin',
    action: 'admin.password_changed',
    module: 'admin',
  });

  sendSuccess(res, null, 'Password changed');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');

  const admin = await Admin.findOne({ email });
  if (!admin) {
    return sendSuccess(res, null, 'If the email exists, a reset link has been sent');
  }

  const resetToken = jwt.signAccessToken({ id: admin._id }, '1h');

  await emailService.send({
    to: admin.email,
    subject: 'Reset Your Admin Password - BizHub',
    html: require('../../templates/emailTemplates').passwordReset({
      name: admin.name,
      token: resetToken,
    }),
  });

  sendSuccess(res, null, 'Reset link sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new ApiError(400, 'Token and new password required');

  const decoded = jwt.verifyAccessToken(token);
  const admin = await Admin.findById(decoded.id).select('+password');
  if (!admin) throw new ApiError(400, 'Invalid token');

  admin.password = newPassword;
  await admin.save();

  await AuditLog.create({
    userId: admin._id,
    userModel: 'Admin',
    action: 'admin.password_reset',
    module: 'admin',
  });

  sendSuccess(res, null, 'Password reset successful');
});

module.exports = { login, logout, refreshToken, getProfile, updateProfile, changePassword, forgotPassword, resetPassword };