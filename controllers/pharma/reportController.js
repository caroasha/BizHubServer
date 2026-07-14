const Sale = require('../../models/pharma/Sale');
const Medicine = require('../../models/pharma/Medicine');
const PurchaseOrder = require('../../models/pharma/PurchaseOrder');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalMedicines, lowStock, expiringSoon, todaySales, monthSales, monthRevenue] = await Promise.all([
    Medicine.countDocuments({ tenantId, isActive: true }),
    Medicine.countDocuments({ tenantId, isActive: true, $expr: { $lte: ['$stock', '$minStockAlert'] } }),
    Medicine.countDocuments({ tenantId, isActive: true, expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }),
    Sale.countDocuments({ tenantId, createdAt: { $gte: today }, paymentStatus: 'paid' }),
    Sale.countDocuments({ tenantId, createdAt: { $gte: thisMonth }, paymentStatus: 'paid' }),
    Sale.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth }, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  sendSuccess(res, { totalMedicines, lowStock, expiringSoon, todaySales, monthSales, monthRevenue: monthRevenue[0]?.total || 0 });
});

const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { tenantId: req.tenant._id, paymentStatus: 'paid' };
  if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

  const sales = await Sale.aggregate([
    { $match: filter },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const total = sales.reduce((sum, s) => sum + s.total, 0);
  sendSuccess(res, { sales, total });
});

const getExpiryReport = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    tenantId: req.tenant._id, isActive: true,
    expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
  }).sort({ expiryDate: 1 }).lean();
  sendSuccess(res, medicines);
});

const getInventoryReport = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({ tenantId: req.tenant._id, isActive: true }).sort({ name: 1 }).lean();
  const totalCost = medicines.reduce((s, m) => s + (m.buyingPrice * m.stock), 0);
  const totalRetail = medicines.reduce((s, m) => s + (m.sellingPrice * m.stock), 0);
  sendSuccess(res, { medicines, totalCost, totalRetail, count: medicines.length });
});

const getPLReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const tenantId = req.tenant._id;
  const filter = { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), paymentStatus: 'paid' };
  if (startDate && endDate) filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

  const sales = await Sale.find(filter).lean();
  const medicines = await Medicine.find({ tenantId, isActive: true }).lean();
  const medMap = {};
  medicines.forEach(m => { medMap[m._id.toString()] = m; });

  const revenue = sales.reduce((s, sale) => s + (sale.totalAmount || 0), 0);
  const cost = sales.reduce((s, sale) => {
    return s + (sale.items || []).reduce((sum, item) => {
      const med = medMap[item.medicineId?.toString()];
      return sum + ((med?.buyingPrice || 0) * item.quantity);
    }, 0);
  }, 0);

  sendSuccess(res, { sales: sales.length, revenue, cost, profit: revenue - cost });
});

module.exports = { getDashboard, getSalesReport, getExpiryReport, getInventoryReport, getPLReport };