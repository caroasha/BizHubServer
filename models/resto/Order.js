const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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

const orderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  orderNumber: {
    type: String,
    required: true,
    trim: true,
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
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
  items: [orderItemSchema],
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
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'takeaway',
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  paymentMethod: {
    type: String,
    enum: ['M-PESA', 'Cash', 'Card', 'Bank Transfer'],
    default: 'Cash',
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  deliveryAddress: {
    street: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    landmark: { type: String, trim: true, default: null },
    instructions: { type: String, trim: true, default: null },
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

orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, orderNumber: 1 });
orderSchema.index({ tenantId: 1, orderStatus: 1 });
orderSchema.index({ tenantId: 1, customerPhone: 1 });

module.exports = mongoose.model('RestoOrder', orderSchema);