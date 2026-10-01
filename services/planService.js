const Plans = require('../models/admin/Plans');
const logger = require('../utils/logger');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class PlanService {
    async getAll({ enabledOnly = true } = {}) {
        const filter = enabledOnly ? { isActive: true } : {};
        const plans = await Plans.find(filter).sort({ sortOrder: 1, price: 1 }).lean();
        if (plans.length === 0) logger.warn('[planService] No plans in DB');
        return plans;
    }

    async getByName(nameOrSlug) {
        if (!nameOrSlug) return null;

        const needle = String(nameOrSlug).trim();
        if (!needle) return null;

        const safe = escapeRegex(needle);

        const plan = await Plans.findOne({
            isActive: true,
            $or: [
                { name: needle },
                { slug: needle },
                { name: new RegExp(`^${safe}$`, 'i') },
                { slug: new RegExp(`^${safe}$`, 'i') },
            ],
        }).lean();

        return plan || null;
    }

    async getBySlug(slug) {
        if (!slug) return null;
        const needle = String(slug).trim();
        if (!needle) return null;
        const safe = escapeRegex(needle);

        return await Plans.findOne({
            isActive: true,
            $or: [
                { slug: needle },
                { slug: new RegExp(`^${safe}$`, 'i') },
            ],
        }).lean();
    }

    async planNames() {
        const plans = await this.getAll();
        return plans.map((p) => p.name);
    }

    async getPlansForTenant(tenant) {
        const plans = await this.getAll();
        const currentPlan = tenant?.settings?.planName || null;
        const currentPlanDoc = currentPlan ? await this.getByName(currentPlan) : null;
        const currentPrice = currentPlanDoc?.price || 0;

        const ordered = plans.map((p, i) => {
            let status = 'available';
            if (p.name === currentPlan) status = 'current';
            else if (p.price <= currentPrice) status = 'purchased';
            else status = 'upgrade_available';

            return {
                name: p.name,
                slug: p.slug,
                price: p.price,
                currency: 'KES',
                cycle: p.cycle,
                order: i + 1,
                features: p.features || [],
                maxUsers: p.maxUsers,
                maxStorageMB: p.maxStorageMB,
                highlighted: p.highlighted,
                status,
                upgradeCost:
                    status === 'upgrade_available' ? Math.max(0, p.price - currentPrice) : 0,
            };
        });

        return { currentPlan, currentPrice, plans: ordered };
    }
}

module.exports = new PlanService();