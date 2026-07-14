const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  customerId: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  address: {
    type: String,
    trim: true,
    default: null,
  },
  preferences: {
    type: String,
    trim: true,
    default: null,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  lastOrderDate: {
    type: Date,
    default: null,
  },
  memberSince: {
    type: Date,
    default: Date.now,
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

customerSchema.index({ tenantId: 1, phone: 1 });
customerSchema.index({ tenantId: 1, name: 1 });
customerSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('RestoCustomer', customerSchema);