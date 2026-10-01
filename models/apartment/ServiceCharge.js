const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  type: { type: String, enum: ['water', 'garbage', 'security', 'electricity', 'other'], required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidDate: { type: Date },
}, { timestamps: true });
module.exports = mongoose.model('ServiceCharge', schema);