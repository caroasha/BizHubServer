const Order = require('../../models/resto/Order');
const Transaction = require('../../models/resto/Transaction');
const Expense = require('../../models/resto/Expense');
const Ingredient = require('../../models/resto/Ingredient');
const Customer = require('../../models/resto/Customer');
const Employee = require('../../models/resto/Employee');
const Reservation = require('../../models/resto/Reservation');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const mongoose = require('mongoose');

// ============================================
// Get Dashboard Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const [
    todayOrders,
    todayRevenue,
    monthlyRevenue,
    totalRevenue,
    todayExpenses,
    monthlyExpenses,
    totalExpenses,
    lowStock,
    totalCustomers,
    activeEmployees,
    todayReservations,
    pendingOrders,
    // Last month for comparison
    lastMonthRevenue
  ] = await Promise.all([
    // Today's Orders
    Order.countDocuments({ tenantId, createdAt: { $gte: today } }),

    // Today's Revenue (from Transactions)
    Transaction.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: today }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),

    // This Month's Revenue
    Transaction.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: thisMonth }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),

    // Total Revenue
    Transaction.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),

    // Today's Expenses
    Expense.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),

    // This Month's Expenses
    Expense.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),

    // Total Expenses
    Expense.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),

    // Low Stock Items
    Ingredient.countDocuments({
      tenantId,
      isActive: true,
      $expr: { $lte: ['$stock', '$minStockAlert'] }
    }),

    // Total Customers
    Customer.countDocuments({ tenantId }),

    // Active Employees
    Employee.countDocuments({ tenantId, isActive: true, status: 'Active' }),

    // Today's Reservations
    Reservation.countDocuments({
      tenantId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      status: { $in: ['Pending', 'Confirmed'] }
    }),

    // Pending Orders
    Order.countDocuments({ tenantId, orderStatus: 'Pending' }),

    // Last Month Revenue (for comparison)
    Transaction.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: lastMonth, $lt: thisMonth }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  const revenue = totalRevenue[0]?.total || 0;
  const expenses = totalExpenses[0]?.total || 0;
  const balance = revenue - expenses;

  // Calculate growth percentage
  const currentMonthRev = monthlyRevenue[0]?.total || 0;
  const prevMonthRev = lastMonthRevenue[0]?.total || 0;
  const growth = prevMonthRev > 0 ? ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0;

  sendSuccess(res, {
    // Orders
    todayOrders: todayOrders || 0,
    pendingOrders: pendingOrders || 0,
    totalOrders: await Order.countDocuments({ tenantId }),

    // Revenue
    todayRevenue: todayRevenue[0]?.total || 0,
    monthlyRevenue: currentMonthRev,
    totalRevenue: revenue,
    revenueGrowth: Math.round(growth),

    // Expenses
    todayExpenses: todayExpenses[0]?.total || 0,
    todayExpensesCount: todayExpenses[0]?.count || 0,
    monthlyExpenses: monthlyExpenses[0]?.total || 0,
    totalExpenses: expenses,

    // Account
    accountBalance: balance,

    // Stock
    lowStockCount: lowStock || 0,
    totalStockItems: await Ingredient.countDocuments({ tenantId, isActive: true }),

    // Customers
    customerCount: totalCustomers || 0,

    // Employees
    employeeCount: activeEmployees || 0,

    // Reservations
    todayReservations: todayReservations || 0,

    // Recent Transactions (last 5)
    recentTransactions: await Transaction.find({
      tenantId,
      paymentStatus: 'Paid'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Recent Orders (last 5)
    recentOrders: await Order.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Today's Revenue by Payment Method
    revenueByPaymentMethod: await Transaction.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          createdAt: { $gte: today },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ])
  });
});

module.exports = { getStats };