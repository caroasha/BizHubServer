const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  hours: { type: Number, default: 1 },
  price: { type: Number, required: true },
  validityDays: { type: Number, default: 30 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Package', schema);