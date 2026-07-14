const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: {
    type: String,
    enum: ['user', 'support'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  attachments: [{
    url: String,
    name: String,
    type: String,
  }],
}, {
  timestamps: true,
});

const supportTicketSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters'],
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
  },
  category: {
    type: String,
    enum: ['billing', 'technical', 'feature', 'bug', 'account', 'other'],
    default: 'other',
  },
  module: {
    type: String,
    enum: ['admin', 'resto', 'pharma', 'apartment', 'electro', 'cyber', 'general'],
    default: 'general',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  responses: [messageSchema],
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

supportTicketSchema.index({ tenantId: 1, status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);