const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        index: true,
    },
    phone: {
        type: String,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false,
    },
    pin: {
        type: String,
        length: 4,
        default: null,
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'technician', 'cashier'],
        default: 'owner',
    },
    permissions: [{ type: String }],
    scope: {
        type: String,
        enum: ['pending', 'paid_wait', 'active', 'expired', 'suspended', 'rejected'],
        default: 'pending',
        index: true,
    },
    scopeChangedAt: {
        type: Date,
        default: Date.now,
    },
    scopeChangedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
    scopeReason: {
        type: String,
        default: null,
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true,
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'failed'],
        default: 'unpaid',
        index: true,
    },
    paymentMethod: {
        type: String,
        default: null,
    },
    paymentReference: {
        type: String,
        default: null,
    },
    paymentDate: {
        type: Date,
        default: null,
    },
    subscriptionStatus: {
        type: String,
        enum: ['pending', 'active', 'expired', 'cancelled'],
        default: 'pending',
    },
    subscriptionStartDate: {
        type: Date,
        default: null,
    },
    subscriptionExpiry: {
        type: Date,
        default: null,
    },
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpire: {
        type: Date,
        default: null,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    lastLoginIp: {
        type: String,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

userSchema.index({ tenantId: 1, email: 1 });
userSchema.index({ tenantId: 1, role: 1 });

module.exports = mongoose.model('ElectroUser', userSchema);