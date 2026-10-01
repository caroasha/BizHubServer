const mongoose = require('mongoose');

const pendingApprovalSchema = new mongoose.Schema({
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
    userModel: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['registration', 'renewal', 'upgrade'],
        default: 'registration',
        index: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'expired'],
        default: 'pending',
        index: true,
    },
    plan: {
        type: String,
        default: null,
    },
    planCycle: {
        type: String,
        default: null,
    },
    amount: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'KES',
    },
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null,
    },
    paymentReceived: {
        type: Boolean,
        default: false,
    },
    paymentReceivedAt: {
        type: Date,
        default: null,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    previousPlan: {
        type: String,
        default: null,
    },
    previousExpiry: {
        type: Date,
        default: null,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    expiresAt: {
        type: Date,
        default: null,
        index: true,
    },
}, {
    timestamps: true,
});

pendingApprovalSchema.index({ tenantId: 1, status: 1 });
pendingApprovalSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('PendingApproval', pendingApprovalSchema);