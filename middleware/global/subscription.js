const ApiError = require('../../utils/ApiError');
const Subscription = require('../../models/admin/Subscription');

// ============================================
// Global Subscription Check
// ============================================

const subscription = async (req, res, next) => {
  try {
    const tenant = req.tenant;

    if (!tenant) {
      return next(new ApiError(401, 'Tenant not found', 'TENANT_NOT_FOUND'));
    }

    // Check if tenant is suspended
    if (tenant.status === 'suspended') {
      return next(new ApiError(403, 'Account suspended. Contact support.', 'ACCOUNT_SUSPENDED'));
    }

    // Check if tenant is cancelled
    if (tenant.status === 'cancelled') {
      return next(new ApiError(403, 'Account cancelled.', 'ACCOUNT_CANCELLED'));
    }

    // Check subscription expiry
    const activeSub = await Subscription.findOne({
      tenantId: tenant._id,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (!activeSub && tenant.status !== 'trial') {
      return next(new ApiError(402, 'Subscription expired. Please renew.', 'SUBSCRIPTION_EXPIRED'));
    }

    req.subscription = activeSub;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = subscription;