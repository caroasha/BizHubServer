const Plans = require('../../models/admin/Plans');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const plans = await Plans.find().sort({ sortOrder: 1 }).lean();
  sendSuccess(res, plans);
});

const getById = asyncHandler(async (req, res) => {
  const plan = await Plans.findById(req.params.id).lean();
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');
  sendSuccess(res, plan);
});

const create = asyncHandler(async (req, res) => {
  const plan = await Plans.create(req.body);

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'plan.created',
    module: 'admin',
    resource: 'Plans',
    resourceId: plan._id,
    details: req.body,
  });

  sendSuccess(res, plan, 'Plan created', 201);
});

const update = asyncHandler(async (req, res) => {
  const plan = await Plans.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'plan.updated',
    module: 'admin',
    resource: 'Plans',
    resourceId: plan._id,
    details: req.body,
  });

  sendSuccess(res, plan, 'Plan updated');
});

const remove = asyncHandler(async (req, res) => {
  const plan = await Plans.findByIdAndDelete(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'plan.deleted',
    module: 'admin',
    resource: 'Plans',
    resourceId: plan._id,
  });

  sendSuccess(res, null, 'Plan deleted');
});

const toggle = asyncHandler(async (req, res) => {
  const plan = await Plans.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');

  plan.isActive = !plan.isActive;
  await plan.save();

  sendSuccess(res, plan, plan.isActive ? 'Plan activated' : 'Plan deactivated');
});

module.exports = { getAll, getById, create, update, remove, toggle };