const Reservation = require('../../models/resto/Reservation');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

// ============================================
// Get All Reservations
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search, date } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };
  
  if (status) filter.status = status;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  
  const [reservations, total] = await Promise.all([
    Reservation.find(filter).sort({ date: 1, time: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Reservation.countDocuments(filter)
  ]);
  
  sendPaginated(res, reservations, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Today's Reservations
// ============================================
const getToday = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  
  const reservations = await Reservation.find({
    tenantId: req.tenant._id,
    date: { $gte: today, $lte: end },
    status: { $in: ['Pending', 'Confirmed'] }
  }).sort({ time: 1 }).lean();
  
  sendSuccess(res, reservations);
});

// ============================================
// Get Reservation by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!reservation) throw new ApiError(404, 'Reservation not found');
  sendSuccess(res, reservation);
});

// ============================================
// Create Reservation
// ============================================
const create = asyncHandler(async (req, res) => {
  const reservation = await Reservation.create({
    ...req.body,
    tenantId: req.tenant._id,
    createdBy: req.user.id
  });
  
  // Send confirmation email
  if (reservation.email) {
    try {
      const templates = require('../../templates/restoEmailTemplates');
      const html = await templates.tableBooking({
        tenantId: req.tenant._id,
        name: reservation.name,
        date: reservation.date.toLocaleDateString(),
        time: reservation.time,
        guests: reservation.guests,
        tableNumber: reservation.tableNumber || 'TBD'
      });
      await emailService.send({
        to: reservation.email,
        subject: 'Table Booking Confirmation',
        html
      });
    } catch (err) {
      logger.error('Failed to send booking confirmation email:', err.message);
    }
  }
  
  sendSuccess(res, reservation, 'Reservation created', 201);
});

// ============================================
// Update Reservation Status
// ============================================
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Confirmed', 'Seated', 'No-show', 'Cancelled'];
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid status');
  
  const reservation = await Reservation.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!reservation) throw new ApiError(404, 'Reservation not found');
  
  reservation.status = status;
  await reservation.save();
  
  sendSuccess(res, reservation, `Reservation status updated to ${status}`);
});

// ============================================
// Cancel Reservation
// ============================================
const cancel = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const reservation = await Reservation.findOne({ _id: req.params.id, tenantId: req.tenant._id });
  if (!reservation) throw new ApiError(404, 'Reservation not found');
  
  reservation.status = 'Cancelled';
  reservation.notes = reason || 'Cancelled by staff';
  await reservation.save();
  
  // Send cancellation notification
  if (reservation.email) {
    try {
      // Simple email notification
      await emailService.send({
        to: reservation.email,
        subject: 'Reservation Cancelled',
        html: `
          <p>Dear ${reservation.name},</p>
          <p>Your reservation for ${reservation.date.toLocaleDateString()} at ${reservation.time} has been cancelled.</p>
          <p>Reason: ${reason || 'Not specified'}</p>
          <p>Please contact us if you have any questions.</p>
        `
      });
    } catch (err) {
      logger.error('Failed to send cancellation email:', err.message);
    }
  }
  
  sendSuccess(res, reservation, 'Reservation cancelled');
});

// ============================================
// Get Reservation Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [total, todayReservations, byStatus] = await Promise.all([
    Reservation.countDocuments({ tenantId }),
    Reservation.countDocuments({ tenantId, date: { $gte: today } }),
    Reservation.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);
  
  sendSuccess(res, { total, todayReservations, byStatus });
});

module.exports = { getAll, getToday, getById, create, updateStatus, cancel, getStats };