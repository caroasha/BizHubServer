const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  computerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', required: true },
  customerName: { type: String, trim: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 },
  rate: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CyberUser' },
}, { timestamps: true });
module.exports = mongoose.model('Session', schema);