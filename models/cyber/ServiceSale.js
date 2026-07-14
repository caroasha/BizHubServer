const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  receiptNumber: { type: String, required: true },
  customerName: { type: String, trim: true },
  customerPhone: { type: String, trim: true },
  items: [{ serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CyberService' }, serviceName: String, quantity: Number, rate: Number, total: Number }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CyberUser' },
}, { timestamps: true });
module.exports = mongoose.model('ServiceSale', schema);