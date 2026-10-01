const Session = require('../../models/cyber/Session');
const ServiceSale = require('../../models/cyber/ServiceSale');
const Computer = require('../../models/cyber/Computer');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [computers, active, todaySessions, monthRevenue] = await Promise.all([
    Computer.countDocuments({ tenantId, isActive: true }),
    Computer.countDocuments({ tenantId, status: 'in-use' }),
    Session.countDocuments({ tenantId, createdAt: { $gte: today } }),
    Session.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);
  const serviceRevenue = await ServiceSale.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
  sendSuccess(res, { computers, active, todaySessions, monthRevenue: (monthRevenue[0]?.total || 0) + (serviceRevenue[0]?.total || 0) });
});

module.exports = { getDashboard };