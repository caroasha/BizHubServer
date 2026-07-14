const Supplier = require('../../models/resto/Supplier');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

// ============================================
// Get All Suppliers
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, isActive } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { products: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) filter.status = status;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Supplier.countDocuments(filter)
  ]);

  sendPaginated(res, suppliers, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Supplier by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  sendSuccess(res, supplier);
});

// ============================================
// Create Supplier
// ============================================
const create = asyncHandler(async (req, res) => {
  const {
    name,
    contactPerson,
    phone,
    email,
    address,
    products,
    paymentTerms,
    status
  } = req.body;

  if (!name || !contactPerson || !phone || !email || !products || !paymentTerms) {
    throw new ApiError(400, 'Name, contact person, phone, email, products and payment terms are required');
  }

  const existing = await Supplier.findOne({
    tenantId: req.tenant._id,
    $or: [{ email }, { phone }]
  });
  if (existing) throw new ApiError(400, 'Supplier with this email or phone already exists');

  const supplier = await Supplier.create({
    tenantId: req.tenant._id,
    name,
    contactPerson,
    phone,
    email,
    address: address || null,
    products,
    paymentTerms,
    status: status || 'Active',
    createdBy: req.user.id
  });

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'supplier.created',
    module: 'resto',
    resource: 'Supplier',
    resourceId: supplier._id
  });

  sendSuccess(res, supplier, 'Supplier added', 201);
});

// ============================================
// Update Supplier
// ============================================
const update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { ...req.body },
    { new: true, runValidators: true }
  );
  if (!supplier) throw new ApiError(404, 'Supplier not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'supplier.updated',
    module: 'resto',
    resource: 'Supplier',
    resourceId: supplier._id
  });

  sendSuccess(res, supplier, 'Supplier updated');
});

// ============================================
// Delete Supplier (Soft Delete)
// ============================================
const remove = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!supplier) throw new ApiError(404, 'Supplier not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'supplier.deleted',
    module: 'resto',
    resource: 'Supplier',
    resourceId: supplier._id
  });

  sendSuccess(res, null, 'Supplier deleted');
});

// ============================================
// Toggle Supplier Status
// ============================================
const toggleStatus = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({
    _id: req.params.id,
    tenantId: req.tenant._id
  });
  if (!supplier) throw new ApiError(404, 'Supplier not found');

  supplier.status = supplier.status === 'Active' ? 'Inactive' : 'Active';
  await supplier.save();

  sendSuccess(res, { status: supplier.status }, `Supplier ${supplier.status}`);
});

// ============================================
// Get Supplier Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;

  const [total, active, inactive] = await Promise.all([
    Supplier.countDocuments({ tenantId }),
    Supplier.countDocuments({ tenantId, status: 'Active' }),
    Supplier.countDocuments({ tenantId, status: 'Inactive' })
  ]);

  sendSuccess(res, { total, active, inactive });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  toggleStatus,
  getStats
};