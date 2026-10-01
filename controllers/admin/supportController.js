const SupportTicket = require('../../models/admin/SupportTicket');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, priority, category, module, search } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (module) filter.module = module;
  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('tenantId', 'businessName businessType')
      .populate('assignedTo', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  sendPaginated(res, tickets, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('tenantId', 'businessName businessType owner contact')
    .populate('assignedTo', 'name email')
    .lean();
  if (!ticket) throw new ApiError(404, 'Ticket not found', 'TICKET_NOT_FOUND');
  sendSuccess(res, ticket);
});

const assign = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found', 'TICKET_NOT_FOUND');

  ticket.assignedTo = req.admin._id;
  if (ticket.status === 'open') ticket.status = 'in-progress';
  await ticket.save();

  await AuditLog.create({
    tenantId: ticket.tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'ticket.assigned',
    module: 'admin',
    resource: 'SupportTicket',
    resourceId: ticket._id,
  });

  sendSuccess(res, ticket, 'Ticket assigned');
});

const respond = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found', 'TICKET_NOT_FOUND');

  ticket.responses.push({
    from: 'support',
    senderId: req.admin._id,
    senderName: req.admin.name,
    message: req.body.message,
  });

  if (ticket.status === 'open') ticket.status = 'in-progress';
  await ticket.save();

  const tenant = await Tenant.findById(ticket.tenantId);
  if (tenant?.contact?.email || tenant?.owner?.email) {
    await emailService.send({
      to: tenant.contact?.email || tenant.owner.email,
      subject: `Ticket #${ticket._id.toString().slice(-6)} Updated`,
      html: require('../../templates/emailTemplates').supportTicketUpdated({
        name: tenant.owner.name,
        ticketId: ticket._id.toString().slice(-6),
        subject: ticket.subject,
        status: ticket.status,
      }),
    });
  }

  sendSuccess(res, ticket, 'Response added');
});

const resolve = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found', 'TICKET_NOT_FOUND');

  ticket.status = 'resolved';
  ticket.resolvedAt = new Date();
  ticket.resolvedBy = req.admin._id;
  await ticket.save();

  const tenant = await Tenant.findById(ticket.tenantId);
  if (tenant?.contact?.email || tenant?.owner?.email) {
    await emailService.send({
      to: tenant.contact?.email || tenant.owner.email,
      subject: `Ticket #${ticket._id.toString().slice(-6)} Resolved`,
      html: require('../../templates/emailTemplates').supportTicketResolved({
        name: tenant.owner.name,
        ticketId: ticket._id.toString().slice(-6),
        subject: ticket.subject,
      }),
    });
  }

  await AuditLog.create({
    tenantId: ticket.tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'ticket.resolved',
    module: 'admin',
    resource: 'SupportTicket',
    resourceId: ticket._id,
  });

  sendSuccess(res, ticket, 'Ticket resolved');
});

const getStats = asyncHandler(async (req, res) => {
  const [open, inProgress, resolved, urgent] = await Promise.all([
    SupportTicket.countDocuments({ status: 'open' }),
    SupportTicket.countDocuments({ status: 'in-progress' }),
    SupportTicket.countDocuments({ status: 'resolved' }),
    SupportTicket.countDocuments({ priority: 'urgent', status: { $ne: 'resolved' } }),
  ]);

  sendSuccess(res, { open, inProgress, resolved, urgent, total: open + inProgress + resolved });
});

module.exports = { getAll, getById, assign, respond, resolve, getStats };