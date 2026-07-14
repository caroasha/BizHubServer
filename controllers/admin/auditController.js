const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, tenantId, userId, action, module, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (tenantId) filter.tenantId = tenantId;
  if (userId) filter.userId = userId;
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (module) filter.module = module;
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  sendPaginated(res, logs, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id).lean();
  if (!log) {
    return sendSuccess(res, null, 'Log not found');
  }
  sendSuccess(res, log);
});

const getByTenant = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find({ tenantId: req.params.tenantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    AuditLog.countDocuments({ tenantId: req.params.tenantId }),
  ]);

  sendPaginated(res, logs, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getActions = asyncHandler(async (req, res) => {
  const actions = await AuditLog.distinct('action');
  sendSuccess(res, actions);
});

const getModules = asyncHandler(async (req, res) => {
  const modules = await AuditLog.distinct('module');
  sendSuccess(res, modules);
});

module.exports = { getAll, getById, getByTenant, getActions, getModules };