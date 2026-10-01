const Category = require('../../models/electro/ProductCategory');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const categories = await Category.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  sendSuccess(res, categories);
});
const create = asyncHandler(async (req, res) => {
  const cat = await Category.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, cat, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const cat = await Category.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!cat) throw new ApiError(404, 'Not found');
  sendSuccess(res, cat, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await Category.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Deleted');
});
module.exports = { getAll, create, update, remove };