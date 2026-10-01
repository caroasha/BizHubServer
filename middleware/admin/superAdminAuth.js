const jwt = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');
const Admin = require('../../models/admin/Admin');

// ============================================
// Super Admin Authentication
// ============================================

const superAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verifyAccessToken(token);

    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return next(new ApiError(401, 'Admin not found', 'ADMIN_NOT_FOUND'));
    }

    if (!admin.isActive) {
      return next(new ApiError(403, 'Account deactivated', 'ACCOUNT_DEACTIVATED'));
    }

    if (admin.role !== 'super_admin') {
      return next(new ApiError(403, 'Super admin access required', 'FORBIDDEN'));
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
};

module.exports = superAdminAuth;