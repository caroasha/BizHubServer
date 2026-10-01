const jwt = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');
const Tenant = require('../../models/admin/Tenant');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verifyAccessToken(token);
    const originalTenant = await Tenant.findById(decoded.tenantId).select('owner.email contact.email').lean();
    if (!originalTenant) return next(new ApiError(404, 'Business not found'));
    const email = originalTenant.owner?.email || originalTenant.contact?.email;
    const tenant = await Tenant.findOne({
      businessType: 'pharmacy',
      $or: [{ 'owner.email': email }, { 'contact.email': email }],
      status: { $in: ['active', 'trial'] },
    });
    if (!tenant) return next(new ApiError(403, 'No pharmacy business found', 'TENANT_NOT_FOUND'));
    req.user = { id: decoded.id, tenantId: tenant._id, role: decoded.role };
    req.tenant = tenant;
    next();
  } catch (error) { next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN')); }
};

module.exports = auth;