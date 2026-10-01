const ApiError = require('../../utils/ApiError');
const Module = require('../../models/admin/Module');
const Subscription = require('../../models/admin/Subscription');

const subscriptionCheck = async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (!tenant) return next(new ApiError(401, 'Tenant not resolved', 'TENANT_NOT_RESOLVED'));
    if (tenant.status === 'suspended') return next(new ApiError(403, 'Account suspended', 'ACCOUNT_SUSPENDED'));
    const moduleAccess = await Module.findOne({ tenantId: tenant._id, moduleName: 'cyber', status: 'active' });
    if (!moduleAccess) return next(new ApiError(403, 'Cyber module not active. Please subscribe.', 'MODULE_INACTIVE'));
    if (tenant.status === 'trial_ended' || tenant.status === 'cancelled') return next(new ApiError(402, 'Subscription expired. Please renew.', 'SUBSCRIPTION_EXPIRED'));
    if (tenant.status === 'trial' || tenant.status === 'active') { req.moduleAccess = moduleAccess; return next(); }
    const activeSub = await Subscription.findOne({ tenantId: tenant._id, status: 'active', endDate: { $gt: new Date() } });
    if (!activeSub) return next(new ApiError(402, 'Subscription expired. Please renew.', 'SUBSCRIPTION_EXPIRED'));
    req.moduleAccess = moduleAccess;
    next();
  } catch (error) { next(error); }
};

module.exports = subscriptionCheck;