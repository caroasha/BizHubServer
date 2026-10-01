const Supplier = require('../../models/electro/Supplier');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, suppliers);
});
const create = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, supplier, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!supplier) throw new ApiError(404, 'Not found');
  sendSuccess(res, supplier, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await Supplier.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Deleted');
});
module.exports = { getAll, create, update, remove };