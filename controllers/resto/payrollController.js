const Payroll = require('../../models/resto/Payroll');
const Employee = require('../../models/resto/Employee');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const emailService = require('../../services/emailService');

// ============================================
// Get All Payroll Records
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, employeeId, payPeriod, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (status) filter.status = status;
  if (employeeId) filter.employeeId = employeeId;
  if (payPeriod) filter.payPeriod = payPeriod;
  if (search) {
    filter.$or = [
      { employeeName: { $regex: search, $options: 'i' } },
      { payPeriod: { $regex: search, $options: 'i' } }
    ];
  }

  const [payrolls, total] = await Promise.all([
    Payroll.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Payroll.countDocuments(filter)
  ]);

  sendPaginated(res, payrolls, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Payroll by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!payroll) throw new ApiError(404, 'Payroll record not found');
  sendSuccess(res, payroll);
});

// ============================================
// Get Payroll by Employee
// ============================================
const getByEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { limit = 10 } = req.query;

  const payrolls = await Payroll.find({
    tenantId: req.tenant._id,
    employeeId
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  sendSuccess(res, payrolls);
});

// ============================================
// Get Payroll by Period
// ============================================
const getByPeriod = asyncHandler(async (req, res) => {
  const { period } = req.params;

  const payrolls = await Payroll.find({
    tenantId: req.tenant._id,
    payPeriod: period
  }).lean();

  sendSuccess(res, payrolls);
});

// ============================================
// Process Payroll for Single Employee
// ============================================
const create = asyncHandler(async (req, res) => {
  const {
    employeeId,
    hoursWorked,
    overtime,
    bonus,
    deductions,
    notes
  } = req.body;

  if (!employeeId) throw new ApiError(400, 'Employee ID required');

  const employee = await Employee.findOne({
    _id: employeeId,
    tenantId: req.tenant._id,
    isActive: true
  });
  if (!employee) throw new ApiError(404, 'Employee not found');

  // Check if payroll already exists for this period
  const payPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM
  const existing = await Payroll.findOne({
    tenantId: req.tenant._id,
    employeeId,
    payPeriod
  });
  if (existing) throw new ApiError(400, 'Payroll already processed for this period');

  // Calculate overtime pay
  const baseSalary = employee.salary;
  const hoursWorkedValue = hoursWorked || 160;
  const overtimeHours = overtime || 0;
  const hourlyRate = baseSalary / 160;
  const overtimePay = overtimeHours * hourlyRate * 1.5;
  const bonusAmount = bonus || 0;
  const deductionAmount = deductions || 0;

  const totalPay = baseSalary + overtimePay + bonusAmount - deductionAmount;

  const payroll = await Payroll.create({
    tenantId: req.tenant._id,
    employeeId: employee._id,
    employeeName: employee.name,
    payPeriod,
    baseSalary,
    hoursWorked: hoursWorkedValue,
    overtime: overtimeHours,
    overtimePay,
    bonus: bonusAmount,
    deductions: deductionAmount,
    totalPay,
    status: 'Pending',
    notes: notes || null,
    createdBy: req.user.id
  });

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'payroll.processed',
    module: 'resto',
    resource: 'Payroll',
    resourceId: payroll._id,
    details: { employeeId, totalPay, payPeriod }
  });

  sendSuccess(res, payroll, 'Payroll processed', 201);
});

// ============================================
// Process Payroll for All Employees
// ============================================
const processAll = asyncHandler(async (req, res) => {
  const {
    hoursWorked,
    overtime,
    bonus,
    deductions
  } = req.body;

  const employees = await Employee.find({
    tenantId: req.tenant._id,
    isActive: true,
    status: 'Active'
  }).lean();

  if (!employees.length) throw new ApiError(400, 'No active employees found');

  const payPeriod = new Date().toISOString().substring(0, 7);
  const results = [];

  for (const employee of employees) {
    // Skip if already processed
    const existing = await Payroll.findOne({
      tenantId: req.tenant._id,
      employeeId: employee._id,
      payPeriod
    });
    if (existing) continue;

    const baseSalary = employee.salary;
    const hoursWorkedValue = hoursWorked || 160;
    const overtimeHours = overtime || 0;
    const hourlyRate = baseSalary / 160;
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const bonusAmount = bonus || 0;
    const deductionAmount = deductions || 0;
    const totalPay = baseSalary + overtimePay + bonusAmount - deductionAmount;

    const payroll = await Payroll.create({
      tenantId: req.tenant._id,
      employeeId: employee._id,
      employeeName: employee.name,
      payPeriod,
      baseSalary,
      hoursWorked: hoursWorkedValue,
      overtime: overtimeHours,
      overtimePay,
      bonus: bonusAmount,
      deductions: deductionAmount,
      totalPay,
      status: 'Pending',
      createdBy: req.user.id
    });

    results.push(payroll);
  }

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'payroll.processed_all',
    module: 'resto',
    details: { count: results.length, payPeriod }
  });

  sendSuccess(
    res,
    { processed: results.length, payPeriod },
    `Processed ${results.length} payroll records`
  );
});

// ============================================
// Pay Salary (Mark as Paid)
// ============================================
const pay = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findOne({
    _id: req.params.id,
    tenantId: req.tenant._id
  });
  if (!payroll) throw new ApiError(404, 'Payroll record not found');

  if (payroll.status === 'Paid') {
    throw new ApiError(400, 'Already paid');
  }

  payroll.status = 'Paid';
  payroll.paymentDate = new Date();
  await payroll.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'payroll.paid',
    module: 'resto',
    resource: 'Payroll',
    resourceId: payroll._id,
    details: { employeeId: payroll.employeeId, amount: payroll.totalPay }
  });

  sendSuccess(res, payroll, 'Salary paid');
});

// ============================================
// Pay All Pending Salaries
// ============================================
const payAll = asyncHandler(async (req, res) => {
  const result = await Payroll.updateMany(
    {
      tenantId: req.tenant._id,
      status: 'Pending'
    },
    {
      status: 'Paid',
      paymentDate: new Date()
    }
  );

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'payroll.paid_all',
    module: 'resto',
    details: { count: result.modifiedCount }
  });

  sendSuccess(res, { paid: result.modifiedCount }, `Paid ${result.modifiedCount} salaries`);
});

// ============================================
// Delete Payroll Record
// ============================================
const remove = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findOne({
    _id: req.params.id,
    tenantId: req.tenant._id
  });
  if (!payroll) throw new ApiError(404, 'Payroll record not found');

  if (payroll.status === 'Paid') {
    throw new ApiError(400, 'Cannot delete paid payroll record');
  }

  await payroll.deleteOne();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'payroll.deleted',
    module: 'resto',
    resource: 'Payroll',
    resourceId: req.params.id
  });

  sendSuccess(res, null, 'Payroll record deleted');
});

// ============================================
// Get Payroll Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;
  const payPeriod = new Date().toISOString().substring(0, 7);

  const [total, pending, paid, thisPeriod, totalPaid] = await Promise.all([
    Payroll.countDocuments({ tenantId }),
    Payroll.countDocuments({ tenantId, status: 'Pending' }),
    Payroll.countDocuments({ tenantId, status: 'Paid' }),
    Payroll.aggregate([
      {
        $match: {
          tenantId: new (require('mongoose').Types.ObjectId)(tenantId),
          payPeriod
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPay' }, count: { $sum: 1 } } }
    ]),
    Payroll.aggregate([
      {
        $match: {
          tenantId: new (require('mongoose').Types.ObjectId)(tenantId),
          status: 'Paid'
        }
      },
      { $group: { _id: null, total: { $sum: '$totalPay' } } }
    ])
  ]);

  sendSuccess(res, {
    total,
    pending,
    paid,
    thisPeriod: {
      total: thisPeriod[0]?.total || 0,
      count: thisPeriod[0]?.count || 0
    },
    totalPaid: totalPaid[0]?.total || 0
  });
});

module.exports = {
  getAll,
  getById,
  getByEmployee,
  getByPeriod,
  create,
  processAll,
  pay,
  payAll,
  remove,
  getStats
};