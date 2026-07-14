const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroProduct' },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroSale' },
  customerName: { type: String, required: true },
  customerPhone: { type: String, trim: true },
  productName: { type: String, required: true },
  serialNo: { type: String, trim: true },
  warrantyPeriod: { type: String, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'claimed'], default: 'active' },
  claims: [{ date: Date, issue: String, resolution: String, cost: Number }],
}, { timestamps: true });
module.exports = mongoose.model('Warranty', schema);