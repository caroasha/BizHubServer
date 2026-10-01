const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  repairNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, trim: true },
  device: { type: String, required: true },
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNo: { type: String, trim: true },
  issue: { type: String, required: true },
  diagnosis: { type: String, trim: true },
  cost: { type: Number, default: 0 },
  status: { type: String, enum: ['received', 'diagnosing', 'repairing', 'completed', 'delivered', 'cancelled'], default: 'received' },
  receivedDate: { type: Date, default: Date.now },
  completedDate: { type: Date },
  deliveredDate: { type: Date },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroUser' },
}, { timestamps: true });
module.exports = mongoose.model('Repair', schema);