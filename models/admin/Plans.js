const mongoose = require('mongoose');

const plansSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  cycle: {
    type: String,
    required: true,
    enum: ['trial', 'monthly', 'yearly', 'permanent'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    default: 0,
  },
  maxUsers: {
    type: Number,
    default: 3,
  },
  maxStorageMB: {
    type: Number,
    default: 500,
  },
  features: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Plans', plansSchema);