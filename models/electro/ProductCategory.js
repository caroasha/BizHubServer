const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('ElectroProductCategory', schema);