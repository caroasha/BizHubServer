const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    default: null,
  },
  userModel: {
    type: String,
    default: null,
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
  },
  module: {
    type: String,
    required: true,
  },
  resource: {
    type: String,
    default: null,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ module: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);