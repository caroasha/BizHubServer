const Product = require('../../models/electro/Product');
const Sale = require('../../models/electro/Sale');
const Repair = require('../../models/electro/Repair');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [totalProducts, lowStock, todaySales, monthRevenue, activeRepairs] = await Promise.all([
    Product.countDocuments({ tenantId, isActive: true }),
    Product.countDocuments({ tenantId, isActive: true, $expr: { $lte: ['$stock', '$minStockAlert'] } }),
    Sale.countDocuments({ tenantId, createdAt: { $gte: today }, paymentStatus: 'paid' }),
    Sale.aggregate([{ $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Repair.countDocuments({ tenantId, status: { $in: ['received', 'diagnosing', 'repairing'] } }),
  ]);
  sendSuccess(res, { totalProducts, lowStock, todaySales, monthRevenue: monthRevenue[0]?.total || 0, activeRepairs });
});

module.exports = { getDashboard };