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
    default: 'general',
    trim: true,
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