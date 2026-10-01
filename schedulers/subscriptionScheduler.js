const cron = require('node-cron');
const dayjs = require('dayjs');
const Subscription = require('../models/admin/Subscription');
const Tenant = require('../models/admin/Tenant');
const Module = require('../models/admin/Module');
const AuditLog = require('../models/admin/AuditLog');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

const USER_MODEL_MAP = {
    restaurant: '../models/resto/User',
    pharmacy: '../models/pharma/User',
    apartment: '../models/apartment/User',
    electronics: '../models/electro/User',
    cyber: '../models/cyber/User',
};

const getUserModel = (businessType) => {
    const path = USER_MODEL_MAP[businessType];
    if (!path) return null;
    try {
        return require(path);
    } catch (err) {
        logger.warn(`Cannot load user model for ${businessType}: ${err.message}`);
        return null;
    }
};

const MODEL_NAMES = {
    restaurant: 'RestoUser',
    pharmacy: 'PharmaUser',
    apartment: 'ApartmentUser',
    electronics: 'ElectroUser',
    cyber: 'CyberUser',
};

/* ============================================================
 * STRICT CASCADE — flip EVERY user, module, and record for this tenant
 * ============================================================ */
const expireTenant = async (tenant, sub, reason = 'subscription_expired') => {
    const now = new Date();
    const tenantId = tenant._id;
    const User = getUserModel(tenant.businessType);

    /* 1. Tenant → trial_ended (blocks all access) */
    const tenantWasActive = tenant.status === 'active' || tenant.status === 'trial';
    if (tenantWasActive) {
        tenant.status = 'trial_ended';
        tenant.expiredAt = now;
        tenant.expiryReason = reason;
        await tenant.save();
    }

    /* 2. Subscription → expired */
    if (sub && sub.status !== 'expired') {
        sub.status = 'expired';
        sub.expiredAt = now;
        await sub.save();
    }

    /* 3. ALL Users of this tenant → scope='expired', isActive=false
     *    This is the STRICT part — no user of an expired tenant can log in. */
    let usersAffected = 0;
    if (User) {
        const result = await User.updateMany(
            { tenantId },
            {
                $set: {
                    scope: 'expired',
                    scopeChangedAt: now,
                    scopeReason: reason,
                    isActive: false,
                    subscriptionStatus: 'expired',
                    subscriptionExpiry: sub?.endDate || null,
                },
            }
        );
        usersAffected = result.modifiedCount || result.nModified || 0;
    }

    /* 4. ALL Modules → inactive */
    const moduleResult = await Module.updateMany(
        { tenantId },
        { $set: { status: 'inactive' } }
    );

    /* 5. Audit log */
    try {
        await AuditLog.create({
            tenantId,
            userModel: 'System',
            action: 'tenant.expired',
            module: 'admin',
            resource: 'Tenant',
            resourceId: tenantId,
            details: {
                businessName: tenant.businessName,
                businessType: tenant.businessType,
                plan: sub?.plan || tenant.settings?.planName,
                endDate: sub?.endDate || null,
                reason,
                usersAffected,
                modulesDeactivated: moduleResult.modifiedCount || 0,
            },
        });
    } catch (err) {
        logger.warn(`Audit log failed: ${err.message}`);
    }

    logger.info(
        `✂️  EXPIRED: ${tenant.businessName} (${tenant.businessType}) — ` +
        `${usersAffected} users, ${moduleResult.modifiedCount || 0} modules, plan=${sub?.plan || 'N/A'}`
    );

    return { usersAffected, modulesDeactivated: moduleResult.modifiedCount || 0 };
};

/* ============================================================
 * NOTIFICATION — to ALL owners of the tenant
 * ============================================================ */
const notifyExpiry = async (tenant, sub) => {
    const results = await Promise.allSettled([
        emailService.sendTemplate('tenantSubscriptionExpired', tenant.owner.email, {
            name: tenant.owner.name,
            businessName: tenant.businessName,
            planName: sub?.plan || tenant.settings?.planName || 'Standard',
            expiredAt: sub?.endDate || new Date(),
            renewalUrl: `${process.env.CLIENT_URL || ''}/renewal?tenant=${tenant._id}`,
        }),
        smsService.sendTemplate('tenantSubscriptionExpired', tenant.owner.phone, {
            businessName: tenant.businessName,
            planName: sub?.plan || tenant.settings?.planName || 'Standard',
        }),
    ]);
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            logger.warn(`Expiry notify #${i} failed: ${r.reason?.message}`);
        }
    });
};

const notifyUpcoming = async (tenant, sub, daysLeft) => {
    const results = await Promise.allSettled([
        emailService.sendTemplate('tenantSubscriptionExpiring', tenant.owner.email, {
            name: tenant.owner.name,
            businessName: tenant.businessName,
            planName: sub.plan,
            expiryDate: dayjs(sub.endDate).format('DD/MM/YYYY'),
            daysLeft,
            renewalUrl: `${process.env.CLIENT_URL || ''}/renewal?tenant=${tenant._id}`,
        }),
        smsService.sendTemplate('tenantSubscriptionExpiring', tenant.owner.phone, {
            businessName: tenant.businessName,
            daysLeft,
        }),
    ]);
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            logger.warn(`Upcoming notify #${i} failed: ${r.reason?.message}`);
        }
    });
};

/* ============================================================
 * MAIN CHECK
 * ============================================================ */
const checkSubscriptions = async () => {
    const startTime = Date.now();
    logger.info('🕐 Subscription scheduler started');

    const today = dayjs().startOf('day');
    let expired = 0;
    let trialEnded = 0;
    let upcoming7 = 0;
    let upcoming3 = 0;
    let errors = 0;

    /* ============================================================
     * PASS 1 — Subscriptions with status 'active'
     * ============================================================ */
    try {
        const activeSubs = await Subscription.find({
            status: 'active',
            endDate: { $exists: true, $ne: null },
        }).populate('tenantId');

        for (const sub of activeSubs) {
            const tenant = sub.tenantId;
            if (!tenant) {
                logger.warn(`Orphan subscription ${sub._id} — no tenant`);
                continue;
            }

            const endDate = dayjs(sub.endDate);
            const daysLeft = endDate.diff(today, 'day');

            try {
                if (daysLeft <= 0) {
                    const result = await expireTenant(tenant, sub, 'subscription_expired');
                    if (result.usersAffected > 0 || tenant.status === 'trial_ended') {
                        await notifyExpiry(tenant, sub);
                        expired++;
                    }
                } else if (daysLeft === 7) {
                    await notifyUpcoming(tenant, sub, 7);
                    upcoming7++;
                } else if (daysLeft === 3) {
                    await notifyUpcoming(tenant, sub, 3);
                    upcoming3++;
                }
            } catch (err) {
                logger.error(`Failed to process sub ${sub._id}:`, err.message);
                errors++;
            }
        }
    } catch (err) {
        logger.error('Pass 1 (active subs) failed:', err);
        errors++;
    }

    /* ============================================================
     * PASS 2 — Watchdog: tenants marked active/trial whose sub
     *          is ALREADY expired (catches stale data)
     * ============================================================ */
    try {
        const staleTenants = await Tenant.find({
            status: { $in: ['active', 'trial'] },
        }).lean();

        for (const tenant of staleTenants) {
            try {
                const sub = await Subscription.findOne({
                    tenantId: tenant._id,
                }).sort({ createdAt: -1 });

                /* Trial without subscription */
                if (tenant.status === 'trial' && !sub) {
                    const trialEnd = dayjs(tenant.createdAt).add(14, 'day');
                    if (trialEnd.isBefore(today)) {
                        const freshTenant = await Tenant.findById(tenant._id);
                        await expireTenant(freshTenant, null, 'trial_ended');
                        trialEnded++;
                    }
                    continue;
                }

                /* Sub exists and is expired but tenant still active */
                if (sub && sub.endDate && dayjs(sub.endDate).isBefore(today) && sub.status !== 'expired') {
                    const freshTenant = await Tenant.findById(tenant._id);
                    const result = await expireTenant(freshTenant, sub, 'subscription_expired');
                    if (result.usersAffected > 0 || freshTenant.status === 'trial_ended') {
                        await notifyExpiry(freshTenant, sub);
                        expired++;
                    }
                }
            } catch (err) {
                logger.error(`Watchdog failed for tenant ${tenant._id}:`, err.message);
                errors++;
            }
        }
    } catch (err) {
        logger.error('Pass 2 (watchdog) failed:', err);
        errors++;
    }

    /* ============================================================
     * PASS 3 — Trial tenants with expired trials (legacy)
     * ============================================================ */
    try {
        const trials = await Tenant.find({
            status: 'trial',
            createdAt: { $exists: true },
        }).lean();

        for (const tenant of trials) {
            const trialEnd = dayjs(tenant.createdAt).add(14, 'day');
            const daysLeft = trialEnd.diff(today, 'day');

            try {
                if (daysLeft === 3) {
                    await Promise.allSettled([
                        emailService.sendTemplate('trialEnding', tenant.owner.email, {
                            name: tenant.owner.name,
                            businessName: tenant.businessName,
                            trialEndDate: trialEnd.format('DD/MM/YYYY'),
                            daysLeft,
                            upgradeUrl: `${process.env.CLIENT_URL || ''}/pricing`,
                        }),
                        smsService.sendTemplate('trialEnding', tenant.owner.phone, {
                            businessName: tenant.businessName,
                            daysLeft,
                        }),
                    ]);
                }

                if (daysLeft <= 0) {
                    const freshTenant = await Tenant.findById(tenant._id);
                    await expireTenant(freshTenant, null, 'trial_ended');
                    trialEnded++;
                }
            } catch (err) {
                logger.error(`Trial processing failed for ${tenant._id}:`, err.message);
                errors++;
            }
        }
    } catch (err) {
        logger.error('Pass 3 (trials) failed:', err);
        errors++;
    }

    const ms = Date.now() - startTime;
    logger.info(
        `🕐 Subscription scheduler done in ${ms}ms — ` +
        `expired=${expired} trialEnded=${trialEnded} ` +
        `notify7d=${upcoming7} notify3d=${upcoming3} errors=${errors}`
    );
};

/* ============================================================
 * SCHEDULE & EXPORTS
 * ============================================================ */

/* Daily at 8:00 AM */
cron.schedule('0 8 * * *', () => {
    checkSubscriptions().catch((err) => logger.error('Scheduler crash:', err));
});

/* Also run every 6 hours as a safety net */
cron.schedule('0 */6 * * *', () => {
    checkSubscriptions().catch((err) => logger.error('Safety-net scheduler crash:', err));
});

checkSubscriptions.runNow = checkSubscriptions;

module.exports = checkSubscriptions;