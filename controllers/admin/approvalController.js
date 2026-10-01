const Tenant = require('../../models/admin/Tenant');
const Subscription = require('../../models/admin/Subscription');
const Module = require('../../models/admin/Module');
const PendingApproval = require('../../models/admin/PendingApproval');
const Invoice = require('../../models/admin/Invoice');
const Admin = require('../../models/admin/Admin');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const auditService = require('../../utils/auditService');
const { expiryFromInterval, isLifetime } = require('../../utils/planDuration');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const cleanupService = require('../../services/tenantCleanupService');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const USER_MODEL_MAP = {
    restaurant: { path: '../../models/resto/User', name: 'RestoUser' },
    pharmacy: { path: '../../models/pharma/User', name: 'PharmaUser' },
    apartment: { path: '../../models/apartment/User', name: 'ApartmentUser' },
    electronics: { path: '../../models/electro/User', name: 'ElectroUser' },
    cyber: { path: '../../models/cyber/User', name: 'CyberUser' },
};

const MODULE_KEY_MAP = {
    restaurant: 'resto',
    pharmacy: 'pharma',
    apartment: 'apartment',
    electronics: 'electro',
    cyber: 'cyber',
};

const MODULE_DISPLAY_NAMES = {
    restaurant: 'RestoManagerKE',
    pharmacy: 'PharmaSys',
    apartment: 'MyApartment',
    electronics: 'ElectroStore',
    cyber: 'DigitalManager',
};

const getUserModel = (businessType) => {
    const entry = USER_MODEL_MAP[businessType];
    if (!entry) throw new ApiError(400, 'Invalid business type');
    return require(entry.path);
};

const getUserModelName = (businessType) => {
    const entry = USER_MODEL_MAP[businessType];
    return entry ? entry.name : 'User';
};

const paymentLabels = {
    momo_stk: 'M-Pesa STK Push',
    mpesa_stk: 'M-Pesa STK Push',
    momo_send: 'Send Money',
    momo_till: 'Till Number',
    momo_paybill: 'Paybill',
    stripe: 'Card (Stripe)',
    manual: 'Manual',
};

const shapeInvoice = (inv) => {
    if (!inv || typeof inv !== 'object') return null;
    return {
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        amountDue: inv.amountDue,
        amountPaid: inv.amountPaid,
        total: inv.total,
        currency: inv.currency,
        status: inv.status,
        paymentState: inv.paymentState,
        dueDate: inv.dueDate,
        issuedAt: inv.issuedAt,
        paidAt: inv.paidAt,
        paymentMethod: inv.paymentMethod,
        paymentRef: inv.paymentRef,
        items: inv.items || [],
        invoiceUrl: inv.invoiceNumber
            ? `${CLIENT_URL}/invoice/${inv.invoiceNumber}`
            : null,
    };
};

const shapePending = (p, type = null) => {
    const t = p.tenantId || {};
    return {
        _id: p._id,
        businessName: t.businessName || 'N/A',
        slug: t.slug || null,
        businessType: t.businessType || null,
        owner: t.owner || {},
        contact: t.contact || {},
        status: t.status || 'pending',
        planName: p.plan || 'N/A',
        planAmount: p.amount || 0,
        planCycle: p.planCycle || 'monthly',
        paymentReceived: !!p.paymentReceived,
        paymentReceivedAt: p.paymentReceivedAt || null,
        invoiceId: p.invoice?._id || p.invoice || null,
        invoice: shapeInvoice(p.invoice),
        previousPlan: p.previousPlan || null,
        previousExpiry: p.previousExpiry || null,
        expiresAt: p.expiresAt || null,
        createdAt: p.createdAt,
        moduleName: MODULE_DISPLAY_NAMES[t.businessType] || t.businessType || null,
        type: type || p.type,
        planInfo: {
            name: p.plan || 'N/A',
            amount: p.amount || 0,
            cycle: p.planCycle || 'monthly',
            paymentMethod: paymentLabels[p.paymentMethod] || p.paymentMethod || 'Manual',
        },
    };
};

/* ================================================================
 * LIST
 * ================================================================ */

const getAll = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending' };
    if (type) filter.type = type;

    const [pending, total] = await Promise.all([
        PendingApproval.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('tenantId')
            .populate('invoice')
            .lean(),
        PendingApproval.countDocuments(filter),
    ]);

    const data = pending.map((p) => shapePending(p));

    return sendPaginated(res, data, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    });
});

const getNew = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending', type: 'registration' };

    const [pending, total] = await Promise.all([
        PendingApproval.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('tenantId')
            .populate('invoice')
            .lean(),
        PendingApproval.countDocuments(filter),
    ]);

    const data = pending.map((p) => shapePending(p, 'new'));

    return sendPaginated(res, data, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    });
});

const getRenewals = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending', type: 'renewal' };

    const [pending, total] = await Promise.all([
        PendingApproval.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('tenantId')
            .populate('invoice')
            .lean(),
        PendingApproval.countDocuments(filter),
    ]);

    const data = pending.map((p) => shapePending(p, 'renewal'));

    return sendPaginated(res, data, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    });
});

const getUpgrades = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending', type: 'upgrade' };

    const [pending, total] = await Promise.all([
        PendingApproval.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('tenantId')
            .populate('invoice')
            .lean(),
        PendingApproval.countDocuments(filter),
    ]);

    const data = pending.map((p) => shapePending(p, 'upgrade'));

    return sendPaginated(res, data, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    });
});

const getStats = asyncHandler(async (req, res) => {
    const [newCount, renewalCount, upgradeCount, paidWait] = await Promise.all([
        PendingApproval.countDocuments({ status: 'pending', type: 'registration' }),
        PendingApproval.countDocuments({ status: 'pending', type: 'renewal' }),
        PendingApproval.countDocuments({ status: 'pending', type: 'upgrade' }),
        PendingApproval.countDocuments({ status: 'pending', paymentReceived: true }),
    ]);

    return sendSuccess(res, {
        new: newCount,
        renewals: renewalCount,
        upgrades: upgradeCount,
        paidWait,
        total: newCount + renewalCount + upgradeCount,
    });
});

/* ================================================================
 * APPROVE
 * ================================================================ */

const approveInternal = async (pendingId, adminId) => {
    const pending = await PendingApproval.findById(pendingId);
    if (!pending) throw new ApiError(404, 'Pending approval not found', 'PENDING_NOT_FOUND');
    if (pending.status !== 'pending') throw new ApiError(400, 'Already processed', 'ALREADY_PROCESSED');
    if (!pending.paymentReceived) throw new ApiError(400, 'Payment not received', 'PAYMENT_REQUIRED');

    const tenant = await Tenant.findById(pending.tenantId);
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

    const User = getUserModel(tenant.businessType);
    const user = await User.findById(pending.userId);
    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    const planCycle = pending.planCycle || tenant.settings?.planCycle || 'monthly';
    const startDate = new Date();
    const endDate = expiryFromInterval(planCycle, startDate);
    const lifetime = isLifetime(planCycle);

    const existingSub = await Subscription.findOne({
        tenantId: tenant._id,
        status: 'pending',
    });

    if (existingSub) {
        existingSub.status = 'active';
        existingSub.plan = pending.plan?.toLowerCase() || 'starter';
        existingSub.amount = pending.amount;
        existingSub.startDate = startDate;
        existingSub.endDate = endDate || new Date('2099-12-31');
        await existingSub.save();
    } else {
        await Subscription.updateMany(
            { tenantId: tenant._id, status: 'active' },
            { status: 'expired' }
        );
        await Subscription.create({
            tenantId: tenant._id,
            plan: pending.plan?.toLowerCase() || 'starter',
            amount: pending.amount,
            currency: pending.currency || 'KES',
            startDate,
            endDate: endDate || new Date('2099-12-31'),
            status: 'active',
            paymentDetails: { method: 'mpesa_stk' },
        });
    }

    const moduleKey = MODULE_KEY_MAP[tenant.businessType];
    const existingModule = await Module.findOne({
        tenantId: tenant._id,
        moduleName: moduleKey,
    });

    if (!existingModule) {
        await Module.create({
            tenantId: tenant._id,
            moduleName: moduleKey,
            status: 'active',
            features: { pos: true, inventory: true, reports: true, mpesa: true },
        });
    } else {
        existingModule.status = 'active';
        await existingModule.save();
    }

    tenant.status = 'active';
    tenant.approvedBy = adminId;
    tenant.approvedAt = new Date();
    await tenant.save();

    user.scope = 'active';
    user.scopeChangedAt = new Date();
    user.scopeChangedBy = adminId;
    user.scopeReason = 'admin_approved';
    user.isActive = true;
    user.approvalStatus = 'approved';
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = startDate;
    user.subscriptionExpiry = lifetime ? null : endDate;
    await user.save();

    pending.status = 'approved';
    pending.approvedBy = adminId;
    pending.approvedAt = new Date();
    await pending.save();

    await auditService.log({
        tenantId: tenant._id,
        userId: adminId,
        userModel: 'Admin',
        action: pending.type === 'renewal' ? 'renewal.approved'
            : pending.type === 'upgrade' ? 'upgrade.approved'
            : 'tenant.approved',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
        details: {
            planName: pending.plan,
            planAmount: pending.amount,
            planCycle: pending.planCycle,
        },
    });

    const moduleDisplayName = MODULE_DISPLAY_NAMES[tenant.businessType] || tenant.businessType;
    const loginUrl = `${CLIENT_URL}/login`;

    Promise.resolve().then(async () => {
        try {
            const templateName = pending.type === 'renewal'
                ? 'tenantRenewalApproved'
                : pending.type === 'upgrade'
                ? 'tenantUpgradeApproved'
                : 'tenantApproved';

            await emailService.sendTemplate(templateName, tenant.owner.email, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
                businessType: tenant.businessType,
                planName: pending.plan,
                module: moduleDisplayName,
                subscriptionStart: startDate,
                subscriptionExpiry: endDate,
                newExpiry: endDate,
                newPlan: pending.plan,
                isLifetime: lifetime,
                loginUrl,
            });
        } catch (err) {
            logger.error('Approval email failed:', err.message);
        }

        try {
            const smsTemplateName = pending.type === 'renewal'
                ? 'tenantRenewalApproved'
                : pending.type === 'upgrade'
                ? 'tenantUpgradeApproved'
                : 'tenantApproved';

            await smsService.sendTemplate(smsTemplateName, tenant.owner.phone, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
                planName: pending.plan,
                newPlan: pending.plan,
                newExpiry: endDate ? endDate.toLocaleDateString('en-KE') : 'Lifetime',
            });
        } catch (err) {
            logger.error('Approval SMS failed:', err.message);
        }
    }).catch((err) => logger.error('Post-approval async failed:', err.message));

    return { tenant, user, pending };
};

const approve = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await approveInternal(id, req.admin._id);
    return sendSuccess(res, {
        tenant: { id: result.tenant._id, status: result.tenant.status },
        user: { id: result.user._id, scope: result.user.scope },
    }, 'Approved and activated');
});

const reject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const pending = await PendingApproval.findById(id);
    if (!pending) throw new ApiError(404, 'Pending approval not found');
    if (pending.status !== 'pending') throw new ApiError(400, 'Already processed');

    const tenant = await Tenant.findById(pending.tenantId);
    if (!tenant) throw new ApiError(404, 'Tenant not found');

    const User = getUserModel(tenant.businessType);
    const user = await User.findById(pending.userId);

    tenant.status = 'rejected';
    tenant.rejectedBy = req.admin._id;
    tenant.rejectedAt = new Date();
    tenant.rejectionReason = reason || 'Rejected by admin';
    await tenant.save();

    if (user) {
        user.scope = 'rejected';
        user.scopeChangedAt = new Date();
        user.scopeChangedBy = req.admin._id;
        user.scopeReason = reason || 'admin_rejected';
        user.isActive = false;
        user.approvalStatus = 'rejected';
        user.rejectionReason = reason || 'Rejected by admin';
        await user.save();
    }

    pending.status = 'rejected';
    pending.rejectedBy = req.admin._id;
    pending.rejectedAt = new Date();
    pending.rejectionReason = reason || 'Rejected by admin';
    await pending.save();

    await auditService.log({
        tenantId: tenant._id,
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'tenant.rejected',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
        details: { reason },
    });

    Promise.resolve().then(async () => {
        try {
            await emailService.sendTemplate('tenantRejected', tenant.owner.email, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
                reason: reason || 'Rejected by admin',
            });
        } catch (err) {
            logger.error('Rejection email failed:', err.message);
        }
    }).catch(() => {});

    return sendSuccess(res, { tenant: { id: tenant._id, status: tenant.status } }, 'Request rejected');
});

const bulkApprove = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return sendError(res, 'IDs array required', 400);
    }

    let approved = 0;
    let failed = 0;
    const errors = [];

    for (const id of ids) {
        try {
            await approveInternal(id, req.admin._id);
            approved++;
        } catch (err) {
            failed++;
            errors.push({ id, error: err.message });
        }
    }

    return sendSuccess(res, { approved, failed, errors }, `Approved ${approved}, failed ${failed}`);
});

/* ================================================================
 * CONFIRM PAYMENT (manual)
 * ================================================================ */

const confirmPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const pending = await PendingApproval.findById(id).populate('invoice');
    if (!pending) throw new ApiError(404, 'Pending approval not found', 'PENDING_NOT_FOUND');
    if (pending.status !== 'pending') throw new ApiError(400, 'Already processed', 'ALREADY_PROCESSED');
    if (pending.paymentReceived) throw new ApiError(400, 'Payment already confirmed', 'ALREADY_PAID');

    const invoice = pending.invoice;
    if (!invoice) throw new ApiError(400, 'No invoice attached to this approval', 'NO_INVOICE');
    if (invoice.status === 'paid' || invoice.paymentState === 'paid') {
        throw new ApiError(400, 'Invoice already paid', 'ALREADY_PAID');
    }

    const tenant = await Tenant.findById(pending.tenantId);
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

    const now = new Date();
    const amountPaid = invoice.amountDue || invoice.total || 0;
    const method = invoice.paymentMethod || 'manual';

    invoice.amountPaid = amountPaid;
    invoice.amountDue = 0;
    invoice.status = 'paid';
    invoice.paymentState = 'paid';
    invoice.paidAt = now;
    invoice.paymentMethod = method;
    await invoice.save();

    tenant.paymentReceived = true;
    tenant.paymentReceivedAt = now;
    await tenant.save();

    try {
        const User = getUserModel(tenant.businessType);
        await User.updateMany(
            { tenantId: tenant._id },
            {
                scope: 'paid_wait',
                scopeChangedAt: now,
                scopeChangedBy: req.admin._id,
                scopeReason: 'payment_confirmed',
            }
        );
    } catch (err) {
        logger.warn(`Scope update failed during confirmPayment: ${err.message}`);
    }

    pending.paymentReceived = true;
    pending.paymentReceivedAt = now;
    await pending.save();

    await auditService.log({
        tenantId: tenant._id,
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'payment.confirmed',
        module: 'admin',
        resource: 'Invoice',
        resourceId: invoice._id,
        details: {
            invoiceNumber: invoice.invoiceNumber,
            amountPaid,
            method,
        },
    });

    const moduleDisplayName = MODULE_DISPLAY_NAMES[tenant.businessType] || tenant.businessType;

    Promise.resolve().then(async () => {
        try {
            await emailService.sendTemplate('tenantPaymentReceived', tenant.owner.email, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
                module: moduleDisplayName,
                invoiceNumber: invoice.invoiceNumber,
                amount: amountPaid,
                currency: invoice.currency || 'KES',
                paymentMethod: method,
                paymentReference: invoice.paymentRef || null,
                paidAt: now,
            });
        } catch (err) {
            logger.error('Payment email failed:', err.message);
        }
        try {
            await smsService.sendTemplate('tenantPaymentReceived', tenant.owner.phone, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
                invoiceNumber: invoice.invoiceNumber,
                amount: amountPaid,
            });
        } catch (err) {
            logger.error('Payment SMS failed:', err.message);
        }
    }).catch(() => {});

    return sendSuccess(
        res,
        {
            approvalId: pending._id,
            invoiceId: invoice._id,
            amountPaid,
            paidAt: now,
        },
        'Payment confirmed'
    );
});

/* ================================================================
 * DELETE APPROVAL (cascade)
 * ================================================================ */

const deleteApproval = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const pending = await PendingApproval.findById(id);
    if (!pending) throw new ApiError(404, 'Pending approval not found', 'PENDING_NOT_FOUND');

    const tenantId = pending.tenantId;

    let report = { deleted: {}, total: 0, tenantDeleted: false, errors: [] };
    if (tenantId) {
        report = await cleanupService.deleteTenantCascade(tenantId);
    }

    await PendingApproval.deleteOne({ _id: pending._id });

    await auditService.log({
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'approval.deleted',
        module: 'admin',
        resource: 'PendingApproval',
        resourceId: pending._id,
        details: {
            type: pending.type,
            deleted: report.deleted,
            total: report.total,
            errors: report.errors,
        },
    });

    return sendSuccess(
        res,
        {
            deleted: report.deleted,
            total: report.total,
            tenantDeleted: report.tenantDeleted,
            errors: report.errors,
        },
        'Approval and related data deleted'
    );
});

module.exports = {
    getAll,
    getNew,
    getRenewals,
    getUpgrades,
    getStats,
    approve,
    reject,
    bulkApprove,
    confirmPayment,
    deleteApproval,
    approveInternal,
};