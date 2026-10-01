const Lease = require('../../models/apartment/Lease');
const Unit = require('../../models/apartment/Unit');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id };
  if (req.query.status) filter.status = req.query.status;
  const leases = await Lease.find(filter).populate('unitId', 'number').populate('occupantId', 'name phone').sort({ createdAt: -1 }).lean();
  sendSuccess(res, leases);
});

const getById = asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({ _id: req.params.id, tenantId: req.tenant._id }).populate('unitId').populate('occupantId').lean();
  if (!lease) throw new ApiError(404, 'Lease not found');
  sendSuccess(res, lease);
});

const create = asyncHandler(async (req, res) => {
  const existing = await Lease.findOne({ unitId: req.body.unitId, status: 'active' });
  if (existing) throw new ApiError(400, 'Unit already has an active lease');
  const lease = await Lease.create({ ...req.body, tenantId: req.tenant._id });
  await Unit.findByIdAndUpdate(req.body.unitId, { status: 'occupied' });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'lease.created', module: 'apartment', resource: 'Lease', resourceId: lease._id });
  sendSuccess(res, lease, 'Lease created', 201);
});

const update = asyncHandler(async (req, res) => {
  const lease = await Lease.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!lease) throw new ApiError(404, 'Lease not found');
  sendSuccess(res, lease, 'Lease updated');
});

const terminate = asyncHandler(async (req, res) => {
  const lease = await Lease.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!lease) throw new ApiError(404, 'Lease not found');
  lease.status = 'terminated';
  await lease.save();
  await Unit.findByIdAndUpdate(lease.unitId, { status: 'vacant' });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'lease.terminated', module: 'apartment', resource: 'Lease', resourceId: lease._id });
  sendSuccess(res, lease, 'Lease terminated');
});

module.exports = { getAll, getById, create, update, terminate };