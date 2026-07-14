const Prescription = require('../../models/pharma/Prescription');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (status) filter.status = status;
  if (search) filter.$or = [{ customerName: { $regex: search, $options: 'i' } }, { customerPhone: { $regex: search, $options: 'i' } }];

  const [prescriptions, total] = await Promise.all([
    Prescription.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Prescription.countDocuments(filter),
  ]);

  sendPaginated(res, prescriptions, {
    page: parseInt(page), limit: parseInt(limit),
    totalPages: Math.ceil(total / limit), totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  sendSuccess(res, prescription);
});

const create = asyncHandler(async (req, res) => {
  const prescription = await Prescription.create({ ...req.body, tenantId: req.tenant._id, createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'prescription.created', module: 'pharma', resource: 'Prescription', resourceId: prescription._id });
  sendSuccess(res, prescription, 'Prescription created', 201);
});

const update = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'prescription.updated', module: 'pharma', resource: 'Prescription', resourceId: prescription._id });
  sendSuccess(res, prescription, 'Prescription updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const prescription = await Prescription.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!prescription) throw new ApiError(404, 'Prescription not found');

  prescription.status = status;
  if (status === 'dispensed') {
    prescription.dispensedBy = req.user._id;
    prescription.dispensedAt = new Date();
  }
  await prescription.save();

  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'prescription.status_updated', module: 'pharma', resource: 'Prescription', resourceId: prescription._id, details: { status } });
  sendSuccess(res, prescription, 'Status updated');
});

module.exports = { getAll, getById, create, update, updateStatus };