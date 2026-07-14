const User = require('../../models/resto/User');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

// ============================================
// Get All Staff
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  const [staff, total] = await Promise.all([
    User.find(filter).select('-password').sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(filter)
  ]);
  
  sendPaginated(res, staff, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Staff by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id })
    .select('-password')
    .lean();
  if (!user) throw new ApiError(404, 'Staff not found');
  sendSuccess(res, user);
});

// ============================================
// Create Staff
// ============================================
const create = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  
  const existing = await User.findOne({
    tenantId: req.tenant._id,
    $or: [{ email }, { phone }]
  });
  if (existing) throw new ApiError(400, 'Email or phone already exists');
  
  const user = await User.create({
    ...req.body,
    tenantId: req.tenant._id
  });
  
  const userData = user.toObject();
  delete userData.password;
  
  sendSuccess(res, userData, 'Staff created', 201);
});

// ============================================
// Update Staff
// ============================================
const update = asyncHandler(async (req, res) => {
  const { password, ...updateData } = req.body;
  const user = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!user) throw new ApiError(404, 'Staff not found');
  
  if (password) {
    user.password = password;
  }
  Object.assign(user, updateData);
  await user.save();
  
  const userData = user.toObject();
  delete userData.password;
  
  sendSuccess(res, userData, 'Staff updated');
});

// ============================================
// Delete Staff (Soft Delete)
// ============================================
const remove = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'Staff not found');
  sendSuccess(res, null, 'Staff deleted');
});

// ============================================
// Change Staff Password
// ============================================
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id }).select('+password');
  if (!user) throw new ApiError(404, 'Staff not found');
  
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect');
  
  user.password = newPassword;
  await user.save();
  
  sendSuccess(res, null, 'Password changed');
});

// ============================================
// Toggle Staff Status
// ============================================
const toggleStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!user) throw new ApiError(404, 'Staff not found');
  
  user.isActive = !user.isActive;
  await user.save();
  
  sendSuccess(res, { isActive: user.isActive }, `Staff ${user.isActive ? 'activated' : 'deactivated'}`);
});

// ============================================
// Get Staff Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const [total, active, inactive, byRole] = await Promise.all([
    User.countDocuments({ tenantId: req.tenant._id }),
    User.countDocuments({ tenantId: req.tenant._id, isActive: true }),
    User.countDocuments({ tenantId: req.tenant._id, isActive: false }),
    User.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(req.tenant._id) } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
  ]);
  
  sendSuccess(res, { total, active, inactive, byRole });
});

module.exports = { getAll, getById, create, update, remove, changePassword, toggleStatus, getStats };