const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant is required'],
    index: true,
  },
  plan: {
    type: String,
    enum: ['starter', 'standard', 'business', 'enterprise', 'trial', 'pending'],
    required: [true, 'Plan is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  currency: {
    type: String,
    default: 'KES',
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active',
  },
  paymentDetails: {
    method: {
      type: String,
      default: 'manual',
    },
    transactionId: { type: String, default: null },
    merchantRequestId: { type: String, default: null },
    checkoutRequestId: { type: String, default: null },
    mpesaReceiptNumber: { type: String, default: null },
    amount: { type: Number, default: null },
    phone: { type: String, default: null },
    date: { type: Date, default: null },
  },
  modules: [{
    type: String,
  }],
  cancelledAt: {
    type: Date,
    default: null,
  },
  cancelReason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);