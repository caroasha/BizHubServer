const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  },
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  tableNumber: {
    type: String,
    trim: true,
    default: null,
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Seated', 'No-show', 'Cancelled'],
    default: 'Pending',
  },
  requests: {
    type: String,
    trim: true,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestoUser',
    default: null,
  },
}, {
  timestamps: true,
});

reservationSchema.index({ tenantId: 1, date: 1 });
reservationSchema.index({ tenantId: 1, phone: 1 });
reservationSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('RestoReservation', reservationSchema);