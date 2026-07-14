const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contactPerson: {
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
    required: true,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
    default: null,
  },
  products: {
    type: String,
    required: true,
    trim: true,
  },
  paymentTerms: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
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

supplierSchema.index({ tenantId: 1, name: 1 });
supplierSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('RestoSupplier', supplierSchema);