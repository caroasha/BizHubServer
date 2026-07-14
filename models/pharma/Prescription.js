const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: String,
  dosage: String,
  frequency: String,
  duration: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  notes: String,
});

const prescriptionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
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
  doctorName: {
    type: String,
    trim: true,
    default: null,
  },
  doctorLicense: {
    type: String,
    trim: true,
    default: null,
  },
  hospitalName: {
    type: String,
    trim: true,
    default: null,
  },
  prescriptionDate: {
    type: Date,
    default: Date.now,
  },
  items: [prescriptionItemSchema],
  image: {
    type: String,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'dispensed', 'cancelled'],
    default: 'pending',
  },
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
  dispensedAt: {
    type: Date,
    default: null,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
}, {
  timestamps: true,
});

prescriptionSchema.index({ tenantId: 1, status: 1 });
prescriptionSchema.index({ tenantId: 1, customerPhone: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);