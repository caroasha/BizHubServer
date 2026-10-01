const mongoose = require('mongoose');

const landingSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    enum: ['hero', 'features', 'modules', 'pricing', 'testimonials', 'faq', 'cta', 'footer'],
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  subtitle: {
    type: String,
    trim: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  items: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
    image: { type: String, trim: true },
    link: { type: String, trim: true },
    order: { type: Number, default: 0 },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

landingSchema.index({ section: 1 });

module.exports = mongoose.model('Landing', landingSchema);