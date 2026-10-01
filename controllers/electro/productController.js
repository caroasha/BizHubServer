const Product = require('../../models/electro/Product');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, categoryId, lowStock } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id, isActive: true };
  if (categoryId) filter.categoryId = categoryId;
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { brand: { $regex: search, $options: 'i' } }, { serialNo: { $regex: search, $options: 'i' } }];
  if (lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStockAlert'] };
  const [products, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name').sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Product.countDocuments(filter),
  ]);
  sendPaginated(res, products, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

const getById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!product) throw new ApiError(404, 'Product not found');
  sendSuccess(res, product);
});

const create = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'product.created', module: 'electro', resource: 'Product', resourceId: product._id });
  sendSuccess(res, product, 'Product created', 201);
});

const update = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!product) throw new ApiError(404, 'Product not found');
  sendSuccess(res, product, 'Product updated');
});

const remove = asyncHandler(async (req, res) => {
  await Product.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, { isActive: false });
  sendSuccess(res, null, 'Product deleted');
});

const adjustStock = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!product) throw new ApiError(404, 'Product not found');
  product.stock += quantity;
  if (product.stock < 0) throw new ApiError(400, 'Insufficient stock');
  await product.save();
  sendSuccess(res, product, 'Stock adjusted');
});

module.exports = { getAll, getById, create, update, remove, adjustStock };