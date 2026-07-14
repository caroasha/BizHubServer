const mongoose = require('mongoose');

const aiSettingsSchema = new mongoose.Schema({
  // Connection
  baseUrl: {
    type: String,
    default: 'https://hdmaiserver.pxxl.click/api/v1',
    trim: true,
  },
  apiKey: {
    type: String,
    default: null,
  },
  model: {
    type: String,
    default: 'groq',
    trim: true,
  },

  // Toggles
  landingAiEnabled: {
    type: Boolean,
    default: true,
  },
  clientAiEnabled: {
    type: Boolean,
    default: true,
  },
  fileUploadEnabled: {
    type: Boolean,
    default: false,
  },

  // Appearance
  color: {
    type: String,
    default: '#1a73e8',
    trim: true,
  },
  position: {
    type: String,
    enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
    default: 'bottom-right',
  },

  // Chat Settings
  aiName: {
    type: String,
    default: 'BizHub Assistant',
    trim: true,
  },
  defaultGreeting: {
    type: String,
    default: 'Hello! How can I help you today?',
    trim: true,
  },

  // Rate Limiter
  rateLimitEnabled: {
    type: Boolean,
    default: true,
  },
  rateLimitMaxRequests: {
    type: Number,
    default: 20,
    min: 1,
    max: 1000,
  },
  rateLimitWindowMinutes: {
    type: Number,
    default: 15,
    min: 1,
    max: 1440,
  },

  // Landing AI System Prompt
  landingSystemPrompt: {
    type: String,
    default: null,
  },

  // Metadata
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AiSettings', aiSettingsSchema);