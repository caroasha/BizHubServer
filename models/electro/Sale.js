const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroProduct', required: true },
  productName: String,
  serialNo: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
});
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  receiptNumber: { type: String, required: true },
  customerName: { type: String, trim: true, default: 'Walk-in Customer' },
  customerPhone: { type: String, trim: true },
  customerEmail: { type: String, trim: true, lowercase: true },
  items: [itemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' },
  source: { type: String, enum: ['pos', 'invoice'], default: 'pos' },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroUser' },
}, { timestamps: true });
module.exports = mongoose.model('ElectroSale', schema);