const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  expenseId: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['Supplier Payment', 'Utility Bill', 'Rent', 'Equipment', 'Maintenance', 'Marketing', 'Salary', 'Other'],
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['M-PESA', 'Cash', 'Bank Transfer'],
    default: 'Cash',
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoSupplier',
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

expenseSchema.index({ tenantId: 1, createdAt: -1 });
expenseSchema.index({ tenantId: 1, type: 1 });
expenseSchema.index({ tenantId: 1, expenseId: 1 });

module.exports = mongoose.model('RestoExpense', expenseSchema);