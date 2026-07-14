const Session = require('../../models/cyber/Session');
const Computer = require('../../models/cyber/Computer');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const templates = require('../../templates/cyberEmailTemplates');
const logger = require('../../utils/logger');

const getAll = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.tenant._id };
  if (req.query.status) filter.status = req.query.status;
  const sessions = await Session.find(filter).populate('computerId', 'name').sort({ createdAt: -1 }).lean();
  sendSuccess(res, sessions);
});

const start = asyncHandler(async (req, res) => {
  const { computerId, customerName, customerEmail } = req.body;
  const computer = await Computer.findOne({ _id: computerId, tenantId: req.tenant._id });
  if (!computer || computer.status !== 'available') throw new ApiError(400, 'Computer not available');
  computer.status = 'in-use'; await computer.save();
  const session = await Session.create({ tenantId: req.tenant._id, computerId, customerName, startTime: new Date(), rate: computer.hourlyRate, createdBy: req.user._id });
  sendSuccess(res, session, 'Session started', 201);
});

const end = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!session || session.status !== 'active') throw new ApiError(404, 'Active session not found');
  session.endTime = new Date();
  const hours = Math.ceil((session.endTime - session.startTime) / (1000 * 60 * 60) * 10) / 10;
  session.duration = hours;
  session.totalAmount = Math.ceil(hours * session.rate);
  session.status = 'completed';
  await session.save();
  await Computer.findByIdAndUpdate(session.computerId, { status: 'available' });

  try {
    const computer = await Computer.findById(session.computerId).select('name').lean();
    const Tenant = require('../../models/admin/Tenant');
    const tenant = await Tenant.findById(req.tenant._id).select('businessName').lean();
    const html = await templates.sessionReceipt({
      tenantId: req.tenant._id, name: session.customerName,
      sessionNo: session._id.toString().slice(-8),
      computer: computer?.name || 'N/A', duration: `${hours} hrs`,
      amount: session.totalAmount,
    });
    // Email sent via sendInvoiceEmail endpoint if customer email provided
  } catch (err) { logger.error('Failed to generate session receipt:', err.message); }

  sendSuccess(res, session, 'Session ended');
});

module.exports = { getAll, start, end };