const jwt = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    let decoded;
    try {
        decoded = jwt.verifyAccessToken(token);
    } catch (err) {
        throw new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
    }

    if (!decoded || !decoded.id) {
        throw new ApiError(401, 'Invalid token payload', 'INVALID_TOKEN');
    }

    req.user = {
        id: decoded.id,
        tenantId: decoded.tenantId || null,
        role: decoded.role || null,
        scope: decoded.scope || null,
        isAdmin: !!decoded.isAdmin,
    };

    next();
});

module.exports = authenticate;