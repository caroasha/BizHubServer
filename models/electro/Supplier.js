const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  phone: { type: String, required: true },
  alternatePhone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  address: { type: String, trim: true },
  contactPerson: { type: String, trim: true },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('ElectroSupplier', schema);