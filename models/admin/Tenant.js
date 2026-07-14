const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: ['restaurant', 'pharmacy', 'apartment', 'electronics', 'cyber'],
  },
  owner: {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    idNumber: { type: String, default: null },
  },
  contact: {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    location: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  logo: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'trial', 'trial_ended', 'suspended', 'cancelled'],
    default: 'pending',
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      dateFormat: 'DD/MM/YYYY',
      receiptFooter: null,
      mpesaTillNumber: null,
    },
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

tenantSchema.index({ businessType: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ 'owner.email': 1 });
tenantSchema.index({ 'owner.phone': 1 });

module.exports = mongoose.model('Tenant', tenantSchema);