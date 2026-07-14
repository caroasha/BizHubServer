const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['printing', 'scanning', 'typing', 'binding', 'lamination', 'other'], required: true },
  ratePerPage: { type: Number, default: 0 },
  ratePerItem: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('CyberService', schema);