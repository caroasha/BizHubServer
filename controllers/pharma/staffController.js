const PharmaUser = require('../../models/pharma/User');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const staff = await PharmaUser.find({ tenantId: req.tenant._id }).select('-password -pin').sort({ createdAt: -1 }).lean();
  sendSuccess(res, staff);
});

const create = asyncHandler(async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email, and password required');

  const exists = await PharmaUser.findOne({ tenantId: req.tenant._id, email });
  if (exists) throw new ApiError(409, 'Staff with this email already exists');

  const user = await PharmaUser.create({
    tenantId: req.tenant._id,
    name, email, phone, role: role || 'cashier', password,
    permissions: role === 'pharmacist' ? ['all'] : ['pos', 'inventory'],
  });

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser', action: 'staff.created', module: 'pharma', resource: 'PharmaUser', resourceId: user._id, details: { name, role } });

  const { password: _, ...userData } = user.toObject();
  sendSuccess(res, userData, 'Staff created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { name, email, phone, role, isActive } = req.body;
  const user = await PharmaUser.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!user) throw new ApiError(404, 'Staff not found');

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (role) { user.role = role; user.permissions = role === 'pharmacist' ? ['all'] : ['pos', 'inventory']; }
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser', action: 'staff.updated', module: 'pharma', resource: 'PharmaUser', resourceId: user._id });
  sendSuccess(res, user, 'Staff updated');
});

const remove = asyncHandler(async (req, res) => {
  const user = await PharmaUser.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false }, { new: true });
  if (!user) throw new ApiError(404, 'Staff not found');

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, userModel: 'PharmaUser', action: 'staff.deleted', module: 'pharma', resource: 'PharmaUser', resourceId: user._id });
  sendSuccess(res, null, 'Staff removed');
});

module.exports = { getAll, create, update, remove };