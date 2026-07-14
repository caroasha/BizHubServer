const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoMenuItem',
    required: true,
  },
  name: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const transactionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  transactionId: {
    type: String,
    required: true,
    trim: true,
  },
  customerName: {
    type: String,
    trim: true,
    default: 'Walk-in Customer',
  },
  customerPhone: {
    type: String,
    trim: true,
    default: null,
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  items: [transactionItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['M-PESA', 'Cash', 'Card', 'Bank Transfer'],
    default: 'Cash',
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Cancelled'],
    default: 'Paid',
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
}, {
  timestamps: true,
});

transactionSchema.index({ tenantId: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, transactionId: 1 });
transactionSchema.index({ tenantId: 1, paymentStatus: 1 });

module.exports = mongoose.model('RestoTransaction', transactionSchema);