const Customer = require('../../models/resto/Customer');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');

// ============================================
// Get All Customers
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Customer.countDocuments(filter)
  ]);

  sendPaginated(res, customers, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Customer by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!customer) throw new ApiError(404, 'Customer not found');
  sendSuccess(res, customer);
});

// ============================================
// Get Customer by Phone
// ============================================
const getByPhone = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    tenantId: req.tenant._id,
    phone: req.params.phone
  }).lean();
  if (!customer) throw new ApiError(404, 'Customer not found');
  sendSuccess(res, customer);
});

// ============================================
// Create Customer
// ============================================
const create = asyncHandler(async (req, res) => {
  const { name, phone, email, address, preferences } = req.body;

  if (!name || !phone) {
    throw new ApiError(400, 'Name and phone are required');
  }

  const existing = await Customer.findOne({
    tenantId: req.tenant._id,
    phone
  });
  if (existing) throw new ApiError(400, 'Customer with this phone already exists');

  const count = await Customer.countDocuments({ tenantId: req.tenant._id });
  const customerId = generateReceiptNo('cust', count + 1);

  const customer = await Customer.create({
    tenantId: req.tenant._id,
    customerId,
    name,
    phone,
    email: email || null,
    address: address || null,
    preferences: preferences || null,
    memberSince: new Date(),
    createdBy: req.user.id
  });

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'customer.created',
    module: 'resto',
    resource: 'Customer',
    resourceId: customer._id
  });

  sendSuccess(res, customer, 'Customer added', 201);
});

// ============================================
// Update Customer
// ============================================
const update = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { ...req.body },
    { new: true, runValidators: true }
  );
  if (!customer) throw new ApiError(404, 'Customer not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'customer.updated',
    module: 'resto',
    resource: 'Customer',
    resourceId: customer._id
  });

  sendSuccess(res, customer, 'Customer updated');
});

// ============================================
// Delete Customer (Soft Delete)
// ============================================
const remove = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!customer) throw new ApiError(404, 'Customer not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'customer.deleted',
    module: 'resto',
    resource: 'Customer',
    resourceId: customer._id
  });

  sendSuccess(res, null, 'Customer deleted');
});

// ============================================
// Get Customer Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, active, newToday, topSpenders] = await Promise.all([
    Customer.countDocuments({ tenantId }),
    Customer.countDocuments({ tenantId, isActive: true }),
    Customer.countDocuments({ tenantId, memberSince: { $gte: today } }),
    Customer.find({ tenantId, isActive: true })
      .sort({ totalSpent: -1 })
      .limit(5)
      .select('name phone totalSpent totalOrders')
      .lean()
  ]);

  sendSuccess(res, { total, active, newToday, topSpenders });
});

module.exports = { getAll, getById, getByPhone, create, update, remove, getStats };