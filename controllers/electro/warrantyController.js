const Warranty = require('../../models/electro/Warranty');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id };
  if (req.query.status) filter.status = req.query.status;
  const warranties = await Warranty.find(filter).sort({ endDate: 1 }).lean();
  sendSuccess(res, warranties);
});
const create = asyncHandler(async (req, res) => {
  const warranty = await Warranty.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, warranty, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const warranty = await Warranty.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!warranty) throw new ApiError(404, 'Not found');
  sendSuccess(res, warranty, 'Updated');
});
module.exports = { getAll, create, update };