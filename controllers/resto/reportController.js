const Order = require('../../models/resto/Order');
const Transaction = require('../../models/resto/Transaction');
const Expense = require('../../models/resto/Expense');
const Reservation = require('../../models/resto/Reservation');
const Ingredient = require('../../models/resto/Ingredient');
const Payroll = require('../../models/resto/Payroll');
const Customer = require('../../models/resto/Customer');
const Employee = require('../../models/resto/Employee');
const Supplier = require('../../models/resto/Supplier');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

// ============================================
// Generate Sales Report
// ============================================
const salesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, 'Start date and end date required');
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const match = {
    tenantId: req.tenant._id,
    createdAt: { $gte: start, $lte: end },
    paymentStatus: 'Paid'
  };

  const [summary, daily, byPaymentMethod, byOrderType] = await Promise.all([
    // Summary
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrder: { $avg: '$totalAmount' }
        }
      }
    ]),
    // Daily breakdown
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    // By payment method
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]),
    // By order type (from orders)
    Order.aggregate([
      {
        $match: {
          tenantId: req.tenant._id,
          createdAt: { $gte: start, $lte: end },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: '$orderType',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ])
  ]);

  sendSuccess(res, {
    period: { startDate: start, endDate: end },
    summary: summary[0] || { totalRevenue: 0, totalOrders: 0, averageOrder: 0 },
    daily: daily || [],
    byPaymentMethod: byPaymentMethod || [],
    byOrderType: byOrderType || []
  });
});

// ============================================
// Generate Expense Report
// ============================================
const expenseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, 'Start date and end date required');
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const match = {
    tenantId: req.tenant._id,
    createdAt: { $gte: start, $lte: end }
  };

  const [summary, byType, daily] = await Promise.all([
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalExpenses: { $sum: 1 },
          averageExpense: { $avg: '$amount' }
        }
      }
    ]),
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),
    Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  sendSuccess(res, {
    period: { startDate: start, endDate: end },
    summary: summary[0] || { totalAmount: 0, totalExpenses: 0, averageExpense: 0 },
    byType: byType || [],
    daily: daily || []
  });
});

// ============================================
// Generate Inventory Report
// ============================================
const inventoryReport = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;

  const [items, summary, byCategory, lowStock] = await Promise.all([
    Ingredient.find({
      tenantId,
      isActive: true
    }).sort({ name: 1 }).lean(),
    Ingredient.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), isActive: true } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$stock', '$costPerUnit'] } },
          totalStock: { $sum: '$stock' }
        }
      }
    ]),
    Ingredient.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          value: { $sum: { $multiply: ['$stock', '$costPerUnit'] } }
        }
      }
    ]),
    Ingredient.find({
      tenantId,
      isActive: true,
      $expr: { $lte: ['$stock', '$minStockAlert'] }
    }).sort({ stock: 1 }).lean()
  ]);

  sendSuccess(res, {
    summary: summary[0] || { totalItems: 0, totalValue: 0, totalStock: 0 },
    byCategory: byCategory || [],
    items: items || [],
    lowStock: lowStock || []
  });
});

// ============================================
// Generate Payroll Report
// ============================================
const payrollReport = asyncHandler(async (req, res) => {
  const { period } = req.query;

  if (!period) {
    throw new ApiError(400, 'Period required (YYYY-MM)');
  }

  const match = {
    tenantId: req.tenant._id,
    payPeriod: period
  };

  const [payrolls, summary, byEmployee] = await Promise.all([
    Payroll.find(match).sort({ employeeName: 1 }).lean(),
    Payroll.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPay: { $sum: '$totalPay' },
          totalEmployees: { $sum: 1 },
          averagePay: { $avg: '$totalPay' }
        }
      }
    ]),
    Payroll.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$employeeName',
          employeeId: { $first: '$employeeId' },
          totalPay: { $sum: '$totalPay' },
          baseSalary: { $first: '$baseSalary' }
        }
      },
      { $sort: { totalPay: -1 } }
    ])
  ]);

  sendSuccess(res, {
    period,
    summary: summary[0] || { totalPay: 0, totalEmployees: 0, averagePay: 0 },
    byEmployee: byEmployee || [],
    payrolls: payrolls || []
  });
});

// ============================================
// Generate General Report (Dashboard Overview)
// ============================================
const generalReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, 'Start date and end date required');
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const tenantId = req.tenant._id;
  const mongoose = require('mongoose');

  // Orders summary
  const orders = await Order.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] } }
      }
    }
  ]);

  // Revenue
  const revenue = await Transaction.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'Paid'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Expenses
  const expenses = await Expense.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Reservations
  const reservations = await Reservation.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Customers
  const customers = await Customer.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        memberSince: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }
  ]);

  // Staff / Employees
  const employees = await Employee.countDocuments({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: true
  });

  const revenueTotal = revenue[0]?.total || 0;
  const expenseTotal = expenses[0]?.total || 0;
  const profit = revenueTotal - expenseTotal;

  sendSuccess(res, {
    period: { startDate: start, endDate: end },
    orders: orders || [],
    revenue: {
      total: revenueTotal,
      count: revenue[0]?.count || 0,
      profit
    },
    expenses: {
      total: expenseTotal,
      count: expenses[0]?.count || 0
    },
    reservations: reservations || [],
    customers: {
      new: customers[0]?.count || 0
    },
    employees
  });
});

module.exports = {
  salesReport,
  expenseReport,
  inventoryReport,
  payrollReport,
  generalReport
};