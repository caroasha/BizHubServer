const Maintenance = require('../../models/apartment/Maintenance');
const Unit = require('../../models/apartment/Unit');
const ApartmentTenant = require('../../models/apartment/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const templates = require('../../templates/apartmentEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.unitId) filter.unitId = req.query.unitId;
  const requests = await Maintenance.find(filter).populate('unitId', 'number').sort({ createdAt: -1 }).lean();
  sendSuccess(res, requests);
});

const create = asyncHandler(async (req, res) => {
  const request = await Maintenance.create({ ...req.body, tenantId: req.tenant._id, createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'maintenance.created', module: 'apartment', resource: 'Maintenance', resourceId: request._id });
  sendSuccess(res, request, 'Request created', 201);
});

const update = asyncHandler(async (req, res) => {
  const request = await Maintenance.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!request) throw new ApiError(404, 'Request not found');

  // Send update email if status changed
  if (req.body.status) {
    try {
      const unit = await Unit.findById(request.unitId).select('number').lean();
      const occupant = await ApartmentTenant.findOne({ unitId: request.unitId, isActive: true }).select('name email').lean();
      if (occupant?.email) {
        const Tenant = require('../../models/admin/Tenant');
        const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
        const html = await templates.maintenanceUpdate({
          tenantId: req.tenant._id,
          name: occupant.name, unitNumber: unit?.number || 'N/A',
          issue: request.issue, status: request.status,
          scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString() : null,
          businessName: tenant?.businessName || 'Property',
        });
        await emailService.send({ to: occupant.email, subject: 'Maintenance Update', html });
      }
    } catch (err) { logger.error('Failed to send maintenance email:', err.message); }
  }

  sendSuccess(res, request, 'Updated');
});

module.exports = { getAll, create, update };