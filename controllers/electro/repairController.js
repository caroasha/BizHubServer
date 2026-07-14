const Repair = require('../../models/electro/Repair');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const templates = require('../../templates/electroEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id };
  if (req.query.status) filter.status = req.query.status;
  const repairs = await Repair.find(filter).sort({ createdAt: -1 }).lean();
  sendSuccess(res, repairs);
});

const create = asyncHandler(async (req, res) => {
  const repairNumber = generateReceiptNo('electronics', Date.now());
  const repair = await Repair.create({ ...req.body, repairNumber, tenantId: req.tenant._id, createdBy: req.user._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'repair.created', module: 'electro', resource: 'Repair', resourceId: repair._id });
  sendSuccess(res, repair, 'Repair created', 201);
});

const update = asyncHandler(async (req, res) => {
  const repair = await Repair.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenant._id }, req.body, { new: true });
  if (!repair) throw new ApiError(404, 'Not found');
  if (req.body.status === 'completed') repair.completedDate = new Date();
  if (req.body.status === 'delivered') repair.deliveredDate = new Date();
  await repair.save();

  if (req.body.status === 'completed' && repair.customerPhone) {
    try {
      const Tenant = require('../../models/admin/Tenant');
      const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
      const html = await templates.repairCompleted({
        tenantId: req.tenant._id, customerName: repair.customerName,
        device: repair.device, repairNumber: repair.repairNumber, cost: repair.cost,
        businessName: tenant?.businessName || 'Shop',
      });
      // Note: customerEmail not in Repair model, would need to be added
      if (repair.customerEmail) {
        await emailService.send({ to: repair.customerEmail, subject: `Repair Completed - ${tenant?.businessName || 'Shop'}`, html });
      }
    } catch (err) { logger.error('Failed to send repair email:', err.message); }
  }

  sendSuccess(res, repair, 'Updated');
});

module.exports = { getAll, create, update };