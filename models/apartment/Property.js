const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  description: { type: String, trim: true },
  totalUnits: { type: Number, default: 0 },
  amenities: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Property', schema);