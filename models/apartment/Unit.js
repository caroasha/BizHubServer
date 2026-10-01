const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  number: { type: String, required: true, trim: true },
  type: { type: String, trim: true },
  rent: { type: Number, required: true },
  deposit: { type: Number, default: 0 },
  status: { type: String, enum: ['vacant', 'occupied', 'maintenance'], default: 'vacant' },
  floor: { type: String, trim: true },
  bedrooms: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Unit', schema);