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
    restaurantName: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    email: { type: String, lowercase: true, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    kraPin: { type: String, trim: true, default: null },
  },
  preferences: {
    currency: { type: String, default: 'KES' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    vatRate: { type: Number, default: 16 },
    serviceCharge: { type: Number, default: 0 },
    receiptFooter: { type: String, trim: true, default: null },
  },
  notifications: {
    orderEmail: { type: Boolean, default: true },
    orderSms: { type: Boolean, default: true },
    lowStockEmail: { type: Boolean, default: true },
    lowStockSms: { type: Boolean, default: false },
    reservationEmail: { type: Boolean, default: true },
    reservationSms: { type: Boolean, default: true },
  },
  openingHours: {
    weekdays: { type: String, default: '8:00 AM - 10:00 PM' },
    weekends: { type: String, default: '9:00 AM - 11:00 PM' },
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('RestoSettings', settingsSchema);