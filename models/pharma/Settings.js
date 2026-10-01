const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    unique: true,
    index: true,
  },
  general: {
    pharmacyName: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    email: { type: String, lowercase: true, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    licenseNo: { type: String, trim: true, default: null },
  },
  preferences: {
    currency: { type: String, default: 'KES' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    lowStockAlert: { type: Number, default: 5 },
    expiryAlertDays: { type: Number, default: 30 },
    receiptFooter: { type: String, trim: true, default: null },
  },
  notifications: {
    lowStockEmail: { type: Boolean, default: true },
    lowStockSms: { type: Boolean, default: false },
    expiryEmail: { type: Boolean, default: true },
    expirySms: { type: Boolean, default: false },
    saleEmail: { type: Boolean, default: false },
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PharmaUser',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PharmaSettings', settingsSchema);