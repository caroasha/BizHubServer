const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required'],
    index: true,
  },
  moduleName: {
    type: String,
    required: true,
    enum: ['resto', 'pharma', 'apartment', 'electro', 'cyber'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  },
  features: {
    pos: { type: Boolean, default: true },
    inventory: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    mpesa: { type: Boolean, default: false },
    loyalty: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    api: { type: Boolean, default: false },
  },
  storageUsed: {
    type: Number,
    default: 0,
  },
  userCount: {
    type: Number,
    default: 0,
  },
  activatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

moduleSchema.index({ tenantId: 1, moduleName: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);