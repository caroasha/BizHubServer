const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicineCategory',
    default: null,
  },
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
  },
  genericName: {
    type: String,
    trim: true,
    default: null,
  },
  dosage: {
    type: String,
    trim: true,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  buyingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  minStockAlert: {
    type: Number,
    default: 5,
  },
  batchNo: {
    type: String,
    trim: true,
    default: null,
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  barcode: {
    type: String,
    trim: true,
    default: null,
  },
  requiresPrescription: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
}, {
  timestamps: true,
});

medicineSchema.index({ tenantId: 1, name: 1 });
medicineSchema.index({ tenantId: 1, expiryDate: 1 });
medicineSchema.index({ tenantId: 1, stock: 1 });
medicineSchema.index({ barcode: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);