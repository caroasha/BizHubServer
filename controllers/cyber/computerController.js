const Computer = require('../../models/cyber/Computer');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const computers = await Computer.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, computers);
});
const create = asyncHandler(async (req, res) => {
  const computer = await Computer.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, computer, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const computer = await Computer.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!computer) throw new ApiError(404, 'Not found');
  sendSuccess(res, computer, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await Computer.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Deleted');
});
module.exports = { getAll, create, update, remove };