const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    enum: ['general', 'subscription', 'payment', 'email', 'sms', 'security', 'features', 'limits'],
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

settingsSchema.index({ category: 1 });

module.exports = mongoose.model('Settings', settingsSchema);