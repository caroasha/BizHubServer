const Customer = require('../../models/cyber/Customer');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id, isActive: true };
  if (req.query.search) filter.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { phone: { $regex: req.query.search, $options: 'i' } }];
  const customers = await Customer.find(filter).populate('packageId', 'name hours').sort({ name: 1 }).lean();
  sendSuccess(res, customers);
});
const create = asyncHandler(async (req, res) => {
  const customer = await Customer.create({ ...req.body, tenantId: req.tenant._id });
  sendSuccess(res, customer, 'Created', 201);
});
const update = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!customer) throw new ApiError(404, 'Not found');
  sendSuccess(res, customer, 'Updated');
});
const remove = asyncHandler(async (req, res) => {
  await Customer.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Deleted');
});
module.exports = { getAll, create, update, remove };