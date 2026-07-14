const mongoose = require('mongoose');

const legalSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['terms', 'privacy', 'refund', 'cookies', 'disclaimer'],
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  version: {
    type: String,
    default: '1.0',
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  lastReviewedAt: {
    type: Date,
    default: null,
  },
  requiresAcceptance: {
    type: Boolean,
    default: false,
  },
  acceptedBy: [{
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    acceptedBy: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    acceptedVersion: {
      type: String,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

legalSchema.index({ status: 1 });

module.exports = mongoose.model('Legal', legalSchema);