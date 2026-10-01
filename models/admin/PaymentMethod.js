const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  // Auto Methods
  momoStkActive: { type: Boolean, default: true },
  stripeActive: { type: Boolean, default: false },
  stripePublicKey: { type: String, default: null },

  // Manual - Send Money
  momoSendActive: { type: Boolean, default: true },
  momoSendNumber: { type: String, default: null },

  // Manual - Till Number
  momoTillActive: { type: Boolean, default: true },
  momoTillNumber: { type: String, default: null },

  // Manual - Paybill
  momoPaybillActive: { type: Boolean, default: true },
  momoPaybillBusiness: { type: String, default: null },
  momoPaybillAccount: { type: String, default: null },

  // Universal
  requireProof: { type: Boolean, default: false },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);