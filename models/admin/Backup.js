const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
    index: true,
  },
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  filepath: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['full', 'tenant', 'module'],
    default: 'full',
  },
  module: {
    type: String,
    enum: ['resto', 'pharma', 'apartment', 'electro', 'cyber', null],
    default: null,
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'in-progress'],
    default: 'completed',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

backupSchema.index({ tenantId: 1, createdAt: -1 });
backupSchema.index({ type: 1 });

module.exports = mongoose.model('Backup', backupSchema);