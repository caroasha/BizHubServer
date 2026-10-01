const RentPayment = require('../../models/apartment/RentPayment');
const Lease = require('../../models/apartment/Lease');
const Unit = require('../../models/apartment/Unit');
const ApartmentTenant = require('../../models/apartment/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const templates = require('../../templates/apartmentEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, leaseId, month } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  if (leaseId) filter.leaseId = leaseId;
  if (month) filter.month = month;
  const [payments, total] = await Promise.all([
    RentPayment.find(filter).populate('unitId', 'number').populate('occupantId', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    RentPayment.countDocuments(filter),
  ]);
  sendPaginated(res, payments, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

const create = asyncHandler(async (req, res) => {
  const receiptNumber = generateReceiptNo('apartment', Date.now());
  const payment = await RentPayment.create({ ...req.body, receiptNumber, tenantId: req.tenant._id });
  await AuditLog.create({ tenantId: req.tenant._id, userId: req.user._id, action: 'rent.paid', module: 'apartment', resource: 'RentPayment', resourceId: payment._id });

  // Send receipt email
  try {
    const occupant = await ApartmentTenant.findById(payment.occupantId).select('name email phone').lean();
    const unit = await Unit.findById(payment.unitId).select('number').lean();
    if (occupant?.email) {
      const Tenant = require('../../models/admin/Tenant');
      const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
      const html = await templates.rentReceipt({
        tenantId: req.tenant._id,
        name: occupant.name, unitNumber: unit?.number || 'N/A',
        receiptNo: receiptNumber, amount: payment.amount,
        month: payment.month, method: payment.paymentMethod,
      });
      await emailService.send({ to: occupant.email, subject: `Rent Receipt - ${tenant?.businessName || 'Property'}`, html });
    }
  } catch (err) { logger.error('Failed to send rent receipt:', err.message); }

  sendSuccess(res, payment, 'Payment recorded', 201);
});

module.exports = { getAll, create };