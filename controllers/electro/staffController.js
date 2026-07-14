const ElectroUser = require('../../models/electro/User');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const staff = await ElectroUser.find({ tenantId: req.tenant._id }).select('-password -pin').sort({ createdAt: -1 }).lean();
  sendSuccess(res, staff);
});
const create = asyncHandler(async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  const exists = await ElectroUser.findOne({ tenantId: req.tenant._id, email });
  if (exists) throw new ApiError(409, 'Staff exists');
  const user = await ElectroUser.create({ tenantId: req.tenant._id, name, email, phone, role: role || 'cashier', password, permissions: ['all'] });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'staff.created', module: 'electro', resource: 'ElectroUser', resourceId: user._id });
  const { password: _, ...data } = user.toObject();
  sendSuccess(res, data, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const user = await ElectroUser.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!user) throw new ApiError(404, 'Not found');
  sendSuccess(res, user, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await ElectroUser.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Removed');
});
module.exports = { getAll, create, update, remove };