const Tenant = require('../../models/admin/Tenant');
const Subscription = require('../../models/admin/Subscription');
const Module = require('../../models/admin/Module');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const auditService = require('../../utils/auditService');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated, sendError } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const cleanupService = require('../../services/tenantCleanupService');
const tenantStatsService = require('../../services/tenantStatsService');

const USER_MODEL_MAP = {
    restaurant: { path: '../../models/resto/User', name: 'RestoUser' },
    pharmacy: { path: '../../models/pharma/User', name: 'PharmaUser' },
    apartment: { path: '../../models/apartment/User', name: 'ApartmentUser' },
    electronics: { path: '../../models/electro/User', name: 'ElectroUser' },
    cyber: { path: '../../models/cyber/User', name: 'CyberUser' },
};

const getUserModel = (businessType) => {
    const entry = USER_MODEL_MAP[businessType];
    if (!entry) throw new ApiError(400, 'Invalid business type');
    return require(entry.path);
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

const MODULE_DISPLAY_NAMES = {
    restaurant: 'RestoManagerKE',
    pharmacy: 'PharmaSys',
    apartment: 'MyApartment',
    electronics: 'ElectroStore',
    cyber: 'DigitalManager',
};

const getAll = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, businessType, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (businessType) filter.businessType = businessType;
    if (search) {
        filter.$or = [
            { businessName: { $regex: search, $options: 'i' } },
            { 'owner.email': { $regex: search, $options: 'i' } },
            { 'owner.phone': { $regex: search, $options: 'i' } },
        ];
    }

    const [tenants, total] = await Promise.all([
        Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Tenant.countDocuments(filter),
    ]);

    const tenantIds = tenants.map((t) => t._id);
    const subs = await Subscription.find({ tenantId: { $in: tenantIds } }).lean();
    const subMap = {};
    subs.forEach((s) => { subMap[s.tenantId.toString()] = s; });

    const data = tenants.map((t) => ({
        ...t,
        subscription: subMap[t._id.toString()] || null,
        planInfo: {
            name: t.settings?.planName || subMap[t._id.toString()]?.plan || 'N/A',
            amount: t.settings?.planAmount || subMap[t._id.toString()]?.amount || 0,
            cycle: t.settings?.planCycle || 'N/A',
            paymentMethod: paymentLabels[t.settings?.paymentMethod] || t.settings?.paymentMethod || 'Manual',
        },
        moduleName: MODULE_DISPLAY_NAMES[t.businessType] || t.businessType,
    }));

    return sendPaginated(res, data, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        totalResults: total,
    });
});

const getById = asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id).lean();
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

    const [subscription, modules, stats] = await Promise.all([
        Subscription.findOne({ tenantId: tenant._id }).lean(),
        Module.find({ tenantId: tenant._id }).lean(),
        tenantStatsService.getTenantStats(tenant).catch((err) => {
            logger.warn('Tenant stats failed:', err.message);
            return { module: tenant.businessType, stats: [], aiRequests: 0 };
        }),
    ]);

    return sendSuccess(res, {
        ...tenant,
        subscription,
        modules,
        stats,
        planInfo: {
            name: tenant.settings?.planName || subscription?.plan || 'N/A',
            amount: tenant.settings?.planAmount || subscription?.amount || 0,
            cycle: tenant.settings?.planCycle || 'N/A',
            paymentMethod: paymentLabels[tenant.settings?.paymentMethod] || tenant.settings?.paymentMethod || 'Manual',
        },
        moduleName: MODULE_DISPLAY_NAMES[tenant.businessType] || tenant.businessType,
    });
});

const update = asyncHandler(async (req, res) => {
    const { businessName, contact, settings } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

    if (businessName) tenant.businessName = businessName;
    if (contact) tenant.contact = { ...tenant.contact, ...contact };
    if (settings) tenant.settings = { ...tenant.settings, ...settings };

    await tenant.save();

    await auditService.log({
        tenantId: tenant._id,
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'tenant.updated',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
        details: req.body,
    });

    return sendSuccess(res, tenant, 'Tenant updated');
});

const suspend = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');
    if (tenant.status === 'suspended') throw new ApiError(400, 'Already suspended');

    tenant.status = 'suspended';
    tenant.suspendedAt = new Date();
    tenant.suspendedBy = req.admin._id;
    tenant.suspendReason = reason || 'Suspended by admin';
    await tenant.save();

    const User = getUserModel(tenant.businessType);
    await User.updateMany(
        { tenantId: tenant._id },
        {
            scope: 'suspended',
            scopeChangedAt: new Date(),
            scopeChangedBy: req.admin._id,
            scopeReason: reason || 'admin_suspended',
        }
    );

    await auditService.log({
        tenantId: tenant._id,
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'tenant.suspended',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
        details: { reason },
    });

    Promise.resolve().then(async () => {
        try {
            await emailService.sendTemplate('tenantSuspended', tenant.owner.email, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
                reason: reason || 'Suspended by admin',
            });
            await smsService.sendTemplate('tenantSuspended', tenant.owner.phone, {
                businessName: tenant.businessName,
                reason: reason || 'Suspended by admin',
            });
        } catch (err) {
            logger.error('Suspension notify failed:', err.message);
        }
    }).catch(() => {});

    return sendSuccess(res, tenant, 'Tenant suspended');
});

const activate = asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

    tenant.status = 'active';
    tenant.reactivatedAt = new Date();
    tenant.reactivatedBy = req.admin._id;
    await tenant.save();

    const User = getUserModel(tenant.businessType);
    await User.updateMany(
        { tenantId: tenant._id },
        {
            scope: 'active',
            scopeChangedAt: new Date(),
            scopeChangedBy: req.admin._id,
            scopeReason: 'admin_reactivated',
            isActive: true,
        }
    );

    await auditService.log({
        tenantId: tenant._id,
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'tenant.activated',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
    });

    Promise.resolve().then(async () => {
        try {
            await emailService.sendTemplate('tenantReactivated', tenant.owner.email, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
            });
            await smsService.sendTemplate('tenantReactivated', tenant.owner.phone, {
                name: tenant.owner.name,
                businessName: tenant.businessName,
            });
        } catch (err) {
            logger.error('Reactivation notify failed:', err.message);
        }
    }).catch(() => {});

    return sendSuccess(res, tenant, 'Tenant activated');
});

const remove = asyncHandler(async (req, res) => {
    const tenant = await Tenant.findById(req.params.id).lean();
    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

    const report = await cleanupService.deleteTenantCascade(tenant._id);

    await auditService.log({
        userId: req.admin._id,
        userModel: 'Admin',
        action: 'tenant.deleted',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
        details: {
            businessName: tenant.businessName,
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
        'Tenant deleted'
    );
});

const getStats = asyncHandler(async (req, res) => {
    const [total, active, pending, suspended, rejected, paidWait] = await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: 'active' }),
        Tenant.countDocuments({ status: 'pending' }),
        Tenant.countDocuments({ status: 'suspended' }),
        Tenant.countDocuments({ status: 'rejected' }),
        Tenant.countDocuments({ status: 'pending', paymentReceived: true }),
    ]);

    return sendSuccess(res, {
        total, active, pending, suspended, rejected, paidWait,
    });
});

module.exports = {
    getAll,
    getById,
    update,
    suspend,
    activate,
    remove,
    getStats,
};