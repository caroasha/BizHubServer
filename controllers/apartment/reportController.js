const Property = require('../../models/apartment/Property');
const Unit = require('../../models/apartment/Unit');
const Lease = require('../../models/apartment/Lease');
const RentPayment = require('../../models/apartment/RentPayment');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const [properties, units, occupied, vacant, activeLeases, monthPayments, monthRevenue] = await Promise.all([
    Property.countDocuments({ tenantId, isActive: true }),
    Unit.countDocuments({ tenantId, isActive: true }),
    Unit.countDocuments({ tenantId, status: 'occupied' }),
    Unit.countDocuments({ tenantId, status: 'vacant' }),
    Lease.countDocuments({ tenantId, status: 'active' }),
    RentPayment.countDocuments({ tenantId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }),
    RentPayment.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  sendSuccess(res, { properties, units, occupied, vacant, activeLeases, monthPayments, monthRevenue: monthRevenue[0]?.total || 0 });
});

module.exports = { getDashboard };