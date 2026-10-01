const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  leaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease', required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  occupantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApartmentTenant', required: true },
  receiptNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
  paymentMethod: { type: String, default: 'cash' },
  paymentDate: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
}, { timestamps: true });
module.exports = mongoose.model('RentPayment', schema);