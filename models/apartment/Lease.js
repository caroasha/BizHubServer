const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  occupantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApartmentTenant', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rent: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'expired', 'terminated'], default: 'active' },
  terms: { type: String, trim: true },
}, { timestamps: true });
module.exports = mongoose.model('Lease', schema);