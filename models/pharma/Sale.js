const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: String,
  batchNo: String,
  dosage: String,
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

const saleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  receiptNumber: {
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
  items: [saleItemSchema],
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
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'cancelled'],
    default: 'paid',
  },
  source: {
    type: String,
    enum: ['pos', 'invoice'],
    default: 'pos',
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
}, {
  timestamps: true,
});

saleSchema.index({ tenantId: 1, createdAt: -1 });
saleSchema.index({ tenantId: 1, receiptNumber: 1 });
saleSchema.index({ tenantId: 1, paymentStatus: 1 });
saleSchema.index({ tenantId: 1, source: 1 });

module.exports = mongoose.model('Sale', saleSchema);