const mongoose = require('mongoose');
const logger = require('../utils/logger');

/* Collections we NEVER delete from during tenant cleanup.
 * Adding to this list prevents accidental wipes. */
const PROTECTED = new Set([
    'admins',
    'settings',
    'landings',
    'legals',
    'aisettings',
    'plans',
    'paymentmethods',
    'backups',
    'supporttickets',
    'auditlogs', // kept for compliance — see D3
]);

const isProtected = (name) => PROTECTED.has(name.toLowerCase());

/* Delete these before generic collections (order matters for refs/hooks). */
const ADMIN_ORDER = [
    'payments',
    'invoices',
    'pendingapprovals',
    'subscriptions',
    'modules',
];

const getModelNames = () => Object.keys(mongoose.models);

/**
 * Cast a tenantId based on the schema path type. Falls back to the other
 * representation if the schema type is unknown.
 */
const buildTenantFilters = (Model, tenantId) => {
    const filters = [];
    const path = Model.schema?.paths?.tenantId;
    const instance = path?.instance; // 'ObjectId' | 'String' | 'Number' | ...

    const asOid = mongoose.Types.ObjectId.isValid(String(tenantId))
        ? new mongoose.Types.ObjectId(String(tenantId))
        : null;
    const asStr = String(tenantId);

    if (instance === 'ObjectId' && asOid) {
        filters.push({ tenantId: asOid });
        filters.push({ tenantId: asStr }); // fallback if stored as string
    } else if (instance === 'String') {
        filters.push({ tenantId: asStr });
        if (asOid) filters.push({ tenantId: asOid });
    } else {
        // unknown — try both
        if (asOid) filters.push({ tenantId: asOid });
        filters.push({ tenantId: asStr });
    }
    return filters;
};

/**
 * Delete all docs with the given tenantId from a single model.
 * Tries the schema-correct form first; if 0 deleted, tries the other form.
 */
const purgeModel = async (Model, tenantId) => {
    const filters = buildTenantFilters(Model, tenantId);
    let total = 0;

    for (const filter of filters) {
        const result = await Model.deleteMany(filter);
        total += result.deletedCount || 0;
        if (total > 0) break; // first hit wins
    }
    return total;
};

/**
 * Dynamically delete every document with the given tenantId across all
 * registered models. Returns per-model counts.
 */
async function deleteTenantData(tenantId, opts = {}) {
    if (!tenantId) throw new Error('tenantId required');

    const skip = opts.skip instanceof Set ? opts.skip : new Set();
    const deleted = {};
    const errors = [];
    let total = 0;

    const allNames = getModelNames().filter((n) => {
        if (isProtected(n) || skip.has(n)) return false;
        if (n === 'Tenant') return false; // handled by cascade
        return true;
    });

    // Partition: admin-ordered first, then everything else
    const lower = (s) => s.toLowerCase();
    const adminSet = new Set(ADMIN_ORDER);
    const ordered = [
        ...ADMIN_ORDER
            .map((key) => allNames.find((n) => lower(n) === key))
            .filter(Boolean),
        ...allNames.filter((n) => !adminSet.has(lower(n))),
    ];

    for (const name of ordered) {
        const Model = mongoose.models[name];
        if (!Model) continue;

        // Only delete if the schema has a tenantId field
        if (!Model.schema?.paths?.tenantId) continue;

        try {
            const count = await purgeModel(Model, tenantId);
            if (count > 0) {
                deleted[name] = count;
                total += count;
            }
        } catch (err) {
            logger.warn(`Cleanup failed for ${name}: ${err.message}`);
            errors.push({ model: name, error: err.message });
        }
    }

    return { deleted, total, errors };
}

/**
 * Full tenant cascade:
 *   1. Delete all data with matching tenantId (dynamic)
 *   2. Delete the Tenant document itself
 */
async function deleteTenantCascade(tenantId) {
    if (!tenantId) throw new Error('tenantId required');

    const Tenant = mongoose.models.Tenant;
    if (!Tenant) throw new Error('Tenant model not registered');

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
        return {
            deleted: {},
            total: 0,
            tenantDeleted: false,
            notFound: true,
            errors: [],
        };
    }

    const { deleted, total, errors } = await deleteTenantData(tenantId);

    let tenantDeleted = false;
    try {
        const result = await Tenant.findByIdAndDelete(tenantId);
        tenantDeleted = !!result;
    } catch (err) {
        logger.error(`Failed to delete Tenant ${tenantId}: ${err.message}`);
        errors.push({ model: 'Tenant', error: err.message });
    }

    logger.info(
        `Tenant cascade ${tenantId}: ${total} docs from ${Object.keys(deleted).length} collections`
    );

    return {
        deleted,
        total,
        tenantDeleted,
        errors,
        tenant: {
            id: tenant._id,
            businessName: tenant.businessName,
            businessType: tenant.businessType,
        },
    };
}

/**
 * Delete only data tied to a tenant (does NOT delete the Tenant doc).
 */
async function deleteTenantDataOnly(tenantId, opts = {}) {
    return deleteTenantData(tenantId, opts);
}

module.exports = {
    deleteTenantCascade,
    deleteTenantDataOnly,
    deleteTenantData,
    PROTECTED,
};