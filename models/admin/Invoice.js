const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    qty: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    userModel: {
        type: String,
        default: null,
    },
    plan: {
        type: String,
        default: null,
    },
    planInterval: {
        type: String,
        default: null,
    },
    type: {
        type: String,
        enum: ['registration', 'renewal', 'upgrade', 'manual'],
        default: 'registration',
        index: true,
    },
    items: [invoiceItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
    },
    tax: {
        type: Number,
        default: 0,
        min: 0,
    },
    total: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    amountPaid: {
        type: Number,
        default: 0,
        min: 0,
    },
    amountDue: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    currency: {
        type: String,
        default: 'KES',
    },
    customerSnapshot: {
        name: { type: String, default: null },
        email: { type: String, default: null },
        phone: { type: String, default: null },
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'failed', 'expired', 'cancelled', 'refunded'],
        default: 'sent',
        index: true,
    },
    paymentState: {
        type: String,
        enum: ['unpaid', 'pending_stk', 'paid', 'failed', 'expired', 'refunded'],
        default: 'unpaid',
        index: true,
    },
    dueDate: {
        type: Date,
        required: true,
        index: true,
    },
    issuedAt: {
        type: Date,
        default: Date.now,
    },
    sentAt: {
        type: Date,
        default: null,
    },
    paidAt: {
        type: Date,
        default: null,
    },
    paymentMethod: {
        type: String,
        default: null,
    },
    paymentRef: {
        type: String,
        default: null,
    },
    stkLastRequest: {
        checkoutRequestId: { type: String, default: null },
        phone: { type: String, default: null },
        requestedAt: { type: Date, default: null },
    },
    paymentInstructions: {
        type: mongoose.Schema.Types.Mixed,
        default: [],
    },
    notes: {
        type: String,
        trim: true,
        default: null,
    },
}, {
    timestamps: true,
});

invoiceSchema.index({ tenantId: 1, createdAt: -1 });
invoiceSchema.index({ tenantId: 1, status: 1 });
invoiceSchema.index({ type: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);