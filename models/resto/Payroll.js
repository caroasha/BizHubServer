const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoEmployee',
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
    trim: true,
  },
  payPeriod: {
    type: String,
    required: true,
    trim: true,
  },
  baseSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  hoursWorked: {
    type: Number,
    default: 160,
    min: 0,
  },
  overtime: {
    type: Number,
    default: 0,
    min: 0,
  },
  overtimePay: {
    type: Number,
    default: 0,
    min: 0,
  },
  bonus: {
    type: Number,
    default: 0,
    min: 0,
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPay: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending',
  },
  paymentDate: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
}, {
  timestamps: true,
});

payrollSchema.index({ tenantId: 1, employeeId: 1 });
payrollSchema.index({ tenantId: 1, payPeriod: 1 });
payrollSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('RestoPayroll', payrollSchema);