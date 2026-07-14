const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  specs: { type: String, trim: true },
  hourlyRate: { type: Number, required: true },
  status: { type: String, enum: ['available', 'in-use', 'maintenance'], default: 'available' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Computer', schema);