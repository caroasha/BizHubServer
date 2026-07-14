const Service = require('../../models/cyber/Service');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const services = await Service.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, services);
});
const create = asyncHandler(async (req, res) => {
  const service = await Service.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, service, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const service = await Service.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!service) throw new ApiError(404, 'Not found');
  sendSuccess(res, service, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await Service.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Deleted');
});
module.exports = { getAll, create, update, remove };