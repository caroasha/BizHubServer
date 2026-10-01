const Plans = require('../../models/admin/Plans');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getAll = asyncHandler(async (req, res) => {
  const plans = await Plans.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  sendSuccess(res, plans);
});

const getBySlug = asyncHandler(async (req, res) => {
  const plan = await Plans.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');
  sendSuccess(res, plan);
});

const compare = asyncHandler(async (req, res) => {
  const plans = await Plans.find({ isActive: true })
    .select('name slug price features maxModules maxUsers maxStorageMB highlighted')
    .sort({ sortOrder: 1 })
    .lean();
  sendSuccess(res, plans);
});

module.exports = { getAll, getBySlug, compare };