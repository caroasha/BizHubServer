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
    required: [true, 'Supplier name is required'],
    trim: true,
  },
  company: {
    type: String,
    trim: true,
    default: null,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: null,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
    default: null,
  },
  address: {
    type: String,
    trim: true,
    default: null,
  },
  contactPerson: {
    type: String,
    trim: true,
    default: null,
  },
  licenseNo: {
    type: String,
    trim: true,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

supplierSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);