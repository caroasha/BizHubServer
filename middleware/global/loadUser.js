const Tenant = require('../../models/admin/Tenant');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');

const USER_MODEL_MAP = {
    restaurant: '../../models/resto/User',
    pharmacy: '../../models/pharma/User',
    apartment: '../../models/apartment/User',
    electronics: '../../models/electro/User',
    cyber: '../../models/cyber/User',
};

const MODEL_NAMES = {
    restaurant: 'RestoUser',
    pharmacy: 'PharmaUser',
    apartment: 'ApartmentUser',
    electronics: 'ElectroUser',
    cyber: 'CyberUser',
};

const loadUser = asyncHandler(async (req, res, next) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id || req.user?._id;

    if (!tenantId || !userId) {
        throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
        throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');
    }

    const userPath = USER_MODEL_MAP[tenant.businessType];
    if (!userPath) {
        throw new ApiError(400, 'Invalid tenant business type', 'INVALID_TENANT');
    }

    const User = require(userPath);
    const user = await User.findById(userId).select('-password -pin').lean();

    if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (user.tenantId.toString() !== tenant._id.toString()) {
        throw new ApiError(403, 'User does not belong to this tenant', 'TENANT_MISMATCH');
    }

    req.user = {
        id: user._id,
        _id: user._id,
        tenantId: tenant._id,
        role: user.role,
        scope: user.scope,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
        paymentStatus: user.paymentStatus,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry,
        userModel: MODEL_NAMES[tenant.businessType],
    };

    req.tenant = tenant;
    req.tenant.userModel = MODEL_NAMES[tenant.businessType];
    req.tenant.businessTypeKey = tenant.businessType;

    next();
});

loadUser.USER_MODEL_MAP = USER_MODEL_MAP;
loadUser.MODEL_NAMES = MODEL_NAMES;

module.exports = loadUser;