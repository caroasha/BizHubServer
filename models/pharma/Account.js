const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  category: {
    type: String,
    enum: ['sales', 'purchase', 'rent', 'utilities', 'salaries', 'supplies', 'other'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  reference: {
    model: {
      type: String,
      enum: ['Sale', 'PurchaseOrder', null],
      default: null,
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
}, {
  timestamps: true,
});

accountSchema.index({ tenantId: 1, type: 1 });
accountSchema.index({ tenantId: 1, date: -1 });
accountSchema.index({ tenantId: 1, category: 1 });

module.exports = mongoose.model('Account', accountSchema);