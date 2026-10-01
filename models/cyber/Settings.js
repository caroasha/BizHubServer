const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
  general: {
    cafeName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
  },
  preferences: {
    currency: { type: String, default: 'KES' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    defaultHourlyRate: { type: Number, default: 60 },
    sessionTimeout: { type: Number, default: 30 },
  },
  notifications: {
    sessionReceiptEmail: { type: Boolean, default: false },
    sessionReceiptSms: { type: Boolean, default: false },
    packageExpiryEmail: { type: Boolean, default: true },
    packageExpirySms: { type: Boolean, default: false },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CyberUser' },
}, { timestamps: true });
module.exports = mongoose.model('CyberSettings', schema);