const Package = require('../../models/cyber/Package');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const packages = await Package.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, packages);
});
const create = asyncHandler(async (req, res) => {
  const pkg = await Package.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, pkg, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const pkg = await Package.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!pkg) throw new ApiError(404, 'Not found');
  sendSuccess(res, pkg, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await Package.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Deleted');
});
module.exports = { getAll, create, update, remove };