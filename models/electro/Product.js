const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroProductCategory' },
  name: { type: String, required: true, trim: true },
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNo: { type: String, trim: true, unique: true, sparse: true },
  buyingPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  minStockAlert: { type: Number, default: 3 },
  warranty: { type: String, trim: true },
  warrantyEnd: { type: Date },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('ElectroProduct', schema);