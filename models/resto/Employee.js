const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  employeeId: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  position: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    enum: ['Kitchen', 'Service', 'Management', 'Cleaning', 'Other'],
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  salary: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'M-PESA', 'Cash'],
    default: 'Bank Transfer',
  },
  hireDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Terminated'],
    default: 'Active',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
}, {
  timestamps: true,
});

employeeSchema.index({ tenantId: 1, employeeId: 1 });
employeeSchema.index({ tenantId: 1, status: 1 });
employeeSchema.index({ tenantId: 1, department: 1 });

module.exports = mongoose.model('RestoEmployee', employeeSchema);