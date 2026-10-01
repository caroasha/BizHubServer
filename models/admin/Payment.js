const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    userModel: {
        type: String,
        default: null,
    },
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true,
    },
    purpose: {
        type: String,
        enum: ['registration', 'renewal', 'upgrade', 'manual'],
        default: 'registration',
    },
    method: {
        type: String,
        enum: ['mpesa_stk', 'mpesa_send', 'mpesa_till', 'mpesa_paybill', 'bank', 'cash', 'stripe', 'manual'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        default: 'KES',
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'cancelled', 'superseded', 'refunded'],
        default: 'pending',
        index: true,
    },
    providerRef: {
        type: String,
        default: null,
        index: true,
    },
    checkoutRequestId: {
        type: String,
        default: null,
        index: true,
    },
    merchantRequestId: {
        type: String,
        default: null,
    },
    mpesaReceipt: {
        type: String,
        default: null,
    },
    phone: {
        type: String,
        default: null,
    },
    providerPayload: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    notes: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

paymentSchema.index({ invoice: 1, status: 1 });
paymentSchema.index({ tenantId: 1, createdAt: -1 });
paymentSchema.index({ checkoutRequestId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);