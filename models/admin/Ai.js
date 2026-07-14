const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  tokensUsed: {
    type: Number,
    default: 0,
  },
  provider: {
    type: String,
    default: 'groq',
  },
}, {
  timestamps: true,
});

const aiSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
    index: true,
  },
  type: {
    type: String,
    enum: ['landing', 'client'],
    required: true,
  },
  systemPrompt: {
    type: String,
    default: null,
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  chatHistory: [chatMessageSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

aiSchema.index({ tenantId: 1, type: 1 });

module.exports = mongoose.model('Ai', aiSchema);