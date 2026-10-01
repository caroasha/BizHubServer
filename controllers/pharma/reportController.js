const Sale = require('../../models/pharma/Sale');
const Medicine = require('../../models/pharma/Medicine');
const PurchaseOrder = require('../../models/pharma/PurchaseOrder');
const Account = require('../../models/pharma/Account');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalMedicines, lowStock, expiringSoon, todaySales, monthSales, monthRevenue] = await Promise.all([
    Medicine.countDocuments({ tenantId, isActive: true }),
    Medicine.countDocuments({ tenantId, isActive: true, $expr: { $lte: ['$stock', '$minStockAlert'] } }),
    Medicine.countDocuments({ tenantId, isActive: true, expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }),
    Sale.countDocuments({ tenantId, createdAt: { $gte: today, $lt: tomorrow }, paymentStatus: 'paid' }),
    Sale.countDocuments({ tenantId, createdAt: { $gte: thisMonth }, paymentStatus: 'paid' }),
    Sale.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), createdAt: { $gte: thisMonth }, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  sendSuccess(res, {
    totalMedicines, lowStock, expiringSoon,
    todaySales, monthSales,
    monthRevenue: monthRevenue[0]?.total || 0,
  });
});

const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { tenantId: req.tenant._id, paymentStatus: 'paid' };
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate + 'T00:00:00.000Z'),
      $lte: new Date(endDate + 'T23:59:59.999Z'),
    };
  }

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
  const filter = { tenantId, type: 'income' };
  const expenseFilter = { tenantId, type: 'expense' };

  if (startDate && endDate) {
    const dateFilter = {
      $gte: new Date(startDate + 'T00:00:00.000Z'),
      $lte: new Date(endDate + 'T23:59:59.999Z'),
    };
    filter.date = dateFilter;
    expenseFilter.date = dateFilter;
  }

  const [income, expense] = await Promise.all([
    Account.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Account.aggregate([{ $match: expenseFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const revenue = income[0]?.total || 0;
  const cost = expense[0]?.total || 0;

  sendSuccess(res, { sales: 0, revenue, cost, profit: revenue - cost });
});

module.exports = { getDashboard, getSalesReport, getExpiryReport, getInventoryReport, getPLReport };