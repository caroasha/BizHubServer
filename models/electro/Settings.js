const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
  general: {
    shopName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
  },
  preferences: {
    currency: { type: String, default: 'KES' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    lowStockAlert: { type: Number, default: 3 },
    warrantyAlertDays: { type: Number, default: 30 },
  },
  notifications: {
    lowStockEmail: { type: Boolean, default: true },
    lowStockSms: { type: Boolean, default: false },
    warrantyEmail: { type: Boolean, default: true },
    warrantySms: { type: Boolean, default: false },
    repairEmail: { type: Boolean, default: true },
    saleEmail: { type: Boolean, default: false },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectroUser' },
}, { timestamps: true });
module.exports = mongoose.model('ElectroSettings', schema);