const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
  general: {
    companyName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
  },
  preferences: {
    currency: { type: String, default: 'KES' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    rentDueDay: { type: Number, default: 5 },
    gracePeriod: { type: Number, default: 3 },
    lateFee: { type: Number, default: 0 },
  },
  notifications: {
    rentReminderEmail: { type: Boolean, default: true },
    rentReminderSms: { type: Boolean, default: false },
    rentOverdueEmail: { type: Boolean, default: true },
    rentOverdueSms: { type: Boolean, default: true },
    maintenanceEmail: { type: Boolean, default: true },
    leaseExpiryEmail: { type: Boolean, default: true },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ApartmentUser' },
}, { timestamps: true });
module.exports = mongoose.model('ApartmentSettings', schema);