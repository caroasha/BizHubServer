'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Per-module stat definitions.
 * Every entry: { key, label, model, filter? }
 * Default filter: { tenantId }
 * Custom filter(tenantId) for filtered counts.
 */
const STATS_BY_MODULE = {
    pharmacy: [
        { key: 'medicines', label: 'Medicines', model: 'Medicine' },
        { key: 'categories', label: 'Categories', model: 'MedicineCategory' },
        { key: 'sales', label: 'Sales', model: 'Sale' },
        { key: 'prescriptions', label: 'Prescriptions', model: 'Prescription' },
        { key: 'purchaseOrders', label: 'Purchase Orders', model: 'PurchaseOrder' },
        { key: 'suppliers', label: 'Suppliers', model: 'Supplier' },
        {
            key: 'lowStock',
            label: 'Low Stock',
            model: 'Medicine',
            filter: (tid) => ({
                tenantId: tid,
                isActive: true,
                $expr: { $lte: ['$stock', '$minStockAlert'] },
            }),
        },
        {
            key: 'expiringSoon',
            label: 'Expiring (30d)',
            model: 'Medicine',
            filter: (tid) => ({
                tenantId: tid,
                isActive: true,
                expiryDate: { $ne: null, $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            }),
        },
    ],

    restaurant: [
        { key: 'orders', label: 'Orders', model: 'RestoOrder' },
        { key: 'customers', label: 'Customers', model: 'RestoCustomer' },
        { key: 'menuItems', label: 'Menu Items', model: 'RestoMenuItem' },
        { key: 'ingredients', label: 'Ingredients', model: 'RestoIngredient' },
        { key: 'reservations', label: 'Reservations', model: 'RestoReservation' },
        { key: 'employees', label: 'Employees', model: 'RestoEmployee' },
        { key: 'expenses', label: 'Expenses', model: 'Expense' },
        { key: 'suppliers', label: 'Suppliers', model: 'RestoSupplier' },
        {
            key: 'lowStock',
            label: 'Low Stock',
            model: 'RestoIngredient',
            filter: (tid) => ({
                tenantId: tid,
                isActive: true,
                $expr: { $lte: ['$stock', '$minStockAlert'] },
            }),
        },
        {
            key: 'activeOrders',
            label: 'Active Orders',
            model: 'RestoOrder',
            filter: (tid) => ({
                tenantId: tid,
                orderStatus: { $in: ['Pending', 'Confirmed', 'Preparing', 'Ready'] },
            }),
        },
    ],

    apartment: [
        { key: 'properties', label: 'Properties', model: 'Property' },
        { key: 'units', label: 'Units', model: 'Unit' },
        { key: 'tenants', label: 'Tenants', model: 'ApartmentTenant' },
        {
            key: 'activeLeases',
            label: 'Active Leases',
            model: 'Lease',
            filter: (tid) => ({ tenantId: tid, status: 'active' }),
        },
        { key: 'rentPayments', label: 'Rent Payments', model: 'RentPayment' },
        {
            key: 'occupiedUnits',
            label: 'Occupied',
            model: 'Unit',
            filter: (tid) => ({ tenantId: tid, status: 'occupied' }),
        },
        {
            key: 'openMaintenance',
            label: 'Open Maintenance',
            model: 'Maintenance',
            filter: (tid) => ({ tenantId: tid, status: { $in: ['reported', 'in-progress'] } }),
        },
    ],

    electronics: [
        { key: 'products', label: 'Products', model: 'ElectroProduct' },
        { key: 'categories', label: 'Categories', model: 'ElectroProductCategory' },
        { key: 'sales', label: 'Sales', model: 'ElectroSale' },
        { key: 'repairs', label: 'Repairs', model: 'Repair' },
        { key: 'suppliers', label: 'Suppliers', model: 'ElectroSupplier' },
        { key: 'warranties', label: 'Warranties', model: 'Warranty' },
        {
            key: 'lowStock',
            label: 'Low Stock',
            model: 'ElectroProduct',
            filter: (tid) => ({
                tenantId: tid,
                isActive: true,
                $expr: { $lte: ['$stock', '$minStockAlert'] },
            }),
        },
        {
            key: 'openRepairs',
            label: 'Open Repairs',
            model: 'Repair',
            filter: (tid) => ({
                tenantId: tid,
                status: { $in: ['received', 'diagnosing', 'repairing'] },
            }),
        },
    ],

    cyber: [
        { key: 'computers', label: 'Computers', model: 'Computer' },
        { key: 'sessions', label: 'Sessions', model: 'Session' },
        { key: 'customers', label: 'Customers', model: 'CyberCustomer' },
        { key: 'services', label: 'Services', model: 'CyberService' },
        { key: 'serviceSales', label: 'Service Sales', model: 'ServiceSale' },
        { key: 'packages', label: 'Packages', model: 'Package' },
        {
            key: 'activeSessions',
            label: 'Active Sessions',
            model: 'Session',
            filter: (tid) => ({ tenantId: tid, status: 'active' }),
        },
        {
            key: 'availableComputers',
            label: 'Available PCs',
            model: 'Computer',
            filter: (tid) => ({ tenantId: tid, status: 'available', isActive: true }),
        },
    ],
};

const resolveModel = (name) => {
    if (mongoose.models[name]) return mongoose.models[name];
    const found = Object.keys(mongoose.models).find(
        (m) => m.toLowerCase() === name.toLowerCase()
    );
    return found ? mongoose.models[found] : null;
};

const countOne = async (Model, tenantId, filterFn) => {
    try {
        const filter = filterFn ? filterFn(tenantId) : { tenantId };
        return await Model.countDocuments(filter);
    } catch (err) {
        logger.warn(`tenantStats: count failed on ${Model.modelName}`, { error: err.message });
        return 0;
    }
};

/**
 * Count total AI chat messages for a tenant.
 * `Ai` docs store a chatHistory array of { role, message, ... }.
 * We count actual user messages (role === 'user'), which is a better
 * proxy for "AI requests" than doc count.
 */
const getAiRequestCount = async (tenantId) => {
    const Ai = resolveModel('Ai');
    if (!Ai || !Ai.schema?.paths?.tenantId) return 0;
    try {
        const result = await Ai.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
            {
                $project: {
                    userMessages: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ['$chatHistory', []] },
                                as: 'm',
                                cond: { $eq: ['$$m.role', 'user'] },
                            },
                        },
                    },
                },
            },
            { $group: { _id: null, total: { $sum: '$userMessages' } } },
        ]);
        return result[0]?.total || 0;
    } catch (err) {
        logger.warn('tenantStats: AI count failed', { error: err.message });
        return 0;
    }
};

async function getTenantStats(tenant) {
    const module = tenant.businessType;
    const defs = STATS_BY_MODULE[module] || [];
    const tenantId = tenant._id;

    const results = await Promise.all(
        defs.map(async (def) => {
            const Model = resolveModel(def.model);
            if (!Model) {
                return { key: def.key, label: def.label, count: 0, missing: true };
            }
            const count = await countOne(Model, tenantId, def.filter);
            return { key: def.key, label: def.label, count };
        })
    );

    const aiRequests = await getAiRequestCount(tenantId);

    return { module, stats: results, aiRequests };
}

module.exports = {
    getTenantStats,
    STATS_BY_MODULE,
};