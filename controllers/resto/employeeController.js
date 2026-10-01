const Employee = require('../../models/resto/Employee');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateReceiptNo } = require('../../utils/generateId');

// ============================================
// Get All Employees
// ============================================
const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, department, status, isActive } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenant._id };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { position: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [employees, total] = await Promise.all([
    Employee.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)).lean(),
    Employee.countDocuments(filter)
  ]);

  sendPaginated(res, employees, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total
  });
});

// ============================================
// Get Employee by ID
// ============================================
const getById = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenant._id }).lean();
  if (!employee) throw new ApiError(404, 'Employee not found');
  sendSuccess(res, employee);
});

// ============================================
// Create Employee
// ============================================
const create = asyncHandler(async (req, res) => {
  const { name, position, department, email, phone, salary, paymentMethod, status } = req.body;

  if (!name || !position || !email || !phone || !salary) {
    throw new ApiError(400, 'Name, position, email, phone and salary are required');
  }

  const existing = await Employee.findOne({
    tenantId: req.tenant._id,
    $or: [{ email }, { phone }]
  });
  if (existing) throw new ApiError(400, 'Employee with this email or phone already exists');

  const count = await Employee.countDocuments({ tenantId: req.tenant._id });
  const employeeId = generateReceiptNo('emp', count + 1);

  const employee = await Employee.create({
    tenantId: req.tenant._id,
    employeeId,
    name,
    position,
    department: department || 'Other',
    email,
    phone,
    salary,
    paymentMethod: paymentMethod || 'Bank Transfer',
    status: status || 'Active',
    hireDate: new Date(),
    createdBy: req.user.id
  });

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'employee.created',
    module: 'resto',
    resource: 'Employee',
    resourceId: employee._id
  });

  sendSuccess(res, employee, 'Employee added', 201);
});

// ============================================
// Update Employee
// ============================================
const update = asyncHandler(async (req, res) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { ...req.body },
    { new: true, runValidators: true }
  );
  if (!employee) throw new ApiError(404, 'Employee not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'employee.updated',
    module: 'resto',
    resource: 'Employee',
    resourceId: employee._id
  });

  sendSuccess(res, employee, 'Employee updated');
});

// ============================================
// Delete Employee (Soft Delete)
// ============================================
const remove = asyncHandler(async (req, res) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { isActive: false },
    { new: true }
  );
  if (!employee) throw new ApiError(404, 'Employee not found');

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'employee.deleted',
    module: 'resto',
    resource: 'Employee',
    resourceId: employee._id
  });

  sendSuccess(res, null, 'Employee deleted');
});

// ============================================
// Update Employee Status
// ============================================
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Active', 'On Leave', 'Terminated'];
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid status');

  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenant._id },
    { status },
    { new: true }
  );
  if (!employee) throw new ApiError(404, 'Employee not found');

  sendSuccess(res, employee, `Employee status updated to ${status}`);
});

// ============================================
// Get Employee Stats
// ============================================
const getStats = asyncHandler(async (req, res) => {
  const tenantId = req.tenant._id;

  const [total, active, onLeave, terminated, byDepartment, totalSalary] = await Promise.all([
    Employee.countDocuments({ tenantId }),
    Employee.countDocuments({ tenantId, status: 'Active' }),
    Employee.countDocuments({ tenantId, status: 'On Leave' }),
    Employee.countDocuments({ tenantId, status: 'Terminated' }),
    Employee.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]),
    Employee.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId), status: 'Active' } },
      { $group: { _id: null, total: { $sum: '$salary' } } }
    ])
  ]);

  sendSuccess(res, {
    total,
    active,
    onLeave,
    terminated,
    byDepartment,
    monthlySalaryTotal: totalSalary[0]?.total || 0
  });
});

module.exports = { getAll, getById, create, update, remove, updateStatus, getStats };