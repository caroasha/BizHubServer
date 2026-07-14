const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  remainingHours: { type: Number, default: 0 },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('CyberCustomer', schema);