const Tenant = require('../../models/admin/Tenant');
const Subscription = require('../../models/admin/Subscription');
const SupportTicket = require('../../models/admin/SupportTicket');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');

const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const [
    totalTenants, activeTenants, trialTenants, pendingTenants,
    totalRevenue, monthlyRevenue, lastMonthRevenue,
    openTickets, totalSubscriptions,
  ] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ status: 'active' }),
    Tenant.countDocuments({ status: 'trial' }),
    Tenant.countDocuments({ status: 'pending' }),
    Subscription.aggregate([
      { $match: { status: 'active', 'paymentDetails.method': { $ne: 'trial' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: thisMonth }, status: 'active', 'paymentDetails.method': { $ne: 'trial' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: lastMonth, $lt: thisMonth }, status: 'active', 'paymentDetails.method': { $ne: 'trial' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
    Subscription.countDocuments({ status: 'active' }),
  ]);

  const byType = await Tenant.aggregate([
    { $group: { _id: '$businessType', count: { $sum: 1 } } },
  ]);

  const byPlan = await Subscription.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$plan', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
  ]);

  sendSuccess(res, {
    tenants: {
      total: totalTenants,
      active: activeTenants,
      trial: trialTenants,
      pending: pendingTenants,
      byType,
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      thisMonth: monthlyRevenue[0]?.total || 0,
      lastMonth: lastMonthRevenue[0]?.total || 0,
    },
    subscriptions: {
      total: totalSubscriptions,
      byPlan,
    },
    support: {
      openTickets,
    },
  });
});

const getRevenueChart = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const revenue = await Subscription.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'active',
        'paymentDetails.method': { $ne: 'trial' },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  sendSuccess(res, revenue);
});

const getTenantGrowth = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const growth = await Tenant.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  sendSuccess(res, growth);
});

module.exports = { getDashboard, getRevenueChart, getTenantGrowth };