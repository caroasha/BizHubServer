const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: String,
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

const purchaseOrderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
    trim: true,
  },
  items: [purchaseOrderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'ordered', 'received', 'cancelled'],
    default: 'draft',
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  expectedDelivery: {
    type: Date,
    default: null,
  },
  receivedDate: {
    type: Date,
    default: null,
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
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
}, {
  timestamps: true,
});

purchaseOrderSchema.index({ tenantId: 1, status: 1 });
purchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);