const crypto = require('crypto');
const Tenant = require('../../models/admin/Tenant');
const Admin = require('../../models/admin/Admin');
const Invoice = require('../../models/admin/Invoice');
const Subscription = require('../../models/admin/Subscription');
const paymentInstructionsService = require('../../services/paymentInstructionsService');
const emailService = require('../../services/emailService');
const jwt = require('../../utils/jwt');
const auditService = require('../../utils/auditService');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

/* ─── USER MODEL LOOKUP ───────────────────────────────── */
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

const getUserModel = (businessType) => {
    const path = USER_MODEL_MAP[businessType];
    if (!path) throw new ApiError(400, `Unknown business type: ${businessType}`);
    return require(path);
};

const getModelName = (businessType) => MODEL_NAMES[businessType] || 'User';

const normalizePhone = (phone) => {
    if (!phone) return null;
    let p = String(phone).replace(/\D/g, '');
    if (p.startsWith('0')) p = `254${p.slice(1)}`;
    if (!p.startsWith('254') && p.length === 9) p = `254${p}`;
    return p;
};

/* ─── SCOPE COMPUTATION ──────────────────────────────── */
const computeScope = (tenant, user) => {
    if (!tenant) return 'pending';
    if (tenant.status === 'suspended') return 'suspended';
    if (tenant.status === 'rejected') return 'rejected';
    if (tenant.status === 'cancelled') return 'expired';
    if (tenant.status === 'trial_ended') return 'expired';

    if (tenant.status === 'pending') {
        return tenant.paymentReceived ? 'paid_wait' : 'pending';
    }

    if (tenant.status === 'active' || tenant.status === 'trial') {
        if (user?.subscriptionExpiry && new Date() > new Date(user.subscriptionExpiry)) {
            return 'expired';
        }
        return 'active';
    }

    return 'pending';
};

/* ─── INVOICE HELPERS ────────────────────────────────── */
const buildFreshInstructions = async (invoice) => {
    if (!invoice) return null;
    try {
        return await paymentInstructionsService.getPaymentInstructions({
            amount: invoice.amountDue ?? invoice.total ?? 0,
            currency: invoice.currency || 'KES',
            invoiceNumber: invoice.invoiceNumber,
        });
    } catch (err) {
        logger.error(
            `Fresh instructions failed for ${invoice.invoiceNumber}: ${err.message}`
        );
        return [];
    }
};

const shapeInvoice = (invoice, freshInstructions = null) => {
    if (!invoice) return null;
    return {
        invoiceNumber: invoice.invoiceNumber,
        amountDue: invoice.amountDue,
        amountPaid: invoice.amountPaid,
        total: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        issuedAt: invoice.issuedAt,
        paidAt: invoice.paidAt,
        status: invoice.status,
        paymentState: invoice.paymentState,
        paymentMethod: invoice.paymentMethod,
        paymentRef: invoice.paymentRef,
        items: invoice.items || [],
        customerSnapshot: invoice.customerSnapshot || {},
        paymentInstructions: freshInstructions || invoice.paymentInstructions || [],
        invoiceUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/invoice/${invoice.invoiceNumber}`,
    };
};

const latestInvoiceForTenant = async (tenantId) => {
    return Invoice.findOne({ tenantId }).sort({ createdAt: -1 }).lean();
};

/* ═══════════════════════════════════════════════════════
 * LOGIN
 * ═══════════════════════════════════════════════════════ */
const login = asyncHandler(async (req, res) => {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
        return sendError(res, 'Email or phone and password required', 400);
    }

    const orQuery = [
        ...(email ? [{ 'owner.email': email }, { 'contact.email': email }] : []),
        ...(phone
            ? [
                  { 'owner.phone': normalizePhone(phone) },
                  { 'contact.phone': normalizePhone(phone) },
              ]
            : []),
    ];

    const tenants = await Tenant.find({ $or: orQuery }).lean();

    if (!tenants || tenants.length === 0) {
        return sendError(res, 'Invalid credentials', 401);
    }

    let authed = null;

    for (const tenant of tenants) {
        try {
            const User = getUserModel(tenant.businessType);
            const user = await User.findOne({
                tenantId: tenant._id,
                $or: [
                    ...(email ? [{ email }] : []),
                    ...(phone ? [{ phone: normalizePhone(phone) }] : []),
                ],
            }).select('+password');

            if (!user || !user.password) continue;

            const match = await user.comparePassword(password);
            if (!match) continue;

            authed = { tenant, user };
            break;
        } catch (err) {
            logger.error(`Login check failed for tenant ${tenant._id}:`, err.message);
        }
    }

    if (!authed) return sendError(res, 'Invalid credentials', 401);

    const { tenant, user } = authed;

    if (tenant.status === 'suspended') {
        return sendError(
            res,
            'Your account has been suspended. Please contact support.',
            403
        );
    }

    if (tenant.status === 'rejected') {
        return sendError(
            res,
            'Your registration was not approved. Please contact support.',
            403
        );
    }

    if (user.isActive === false && scopeIsNotPending(tenant)) {
        return sendError(res, 'Account is not active. Please contact support.', 403);
    }

    const scope = computeScope(tenant, user);

    const User = getUserModel(tenant.businessType);
    const userDoc = await User.findById(user._id).select('-password -pin').lean();

    let invoice = null;
    if (scope === 'pending' || scope === 'paid_wait' || scope === 'expired') {
        const raw = await latestInvoiceForTenant(tenant._id);
        if (raw) {
            const fresh = await buildFreshInstructions(raw);
            invoice = shapeInvoice(raw, fresh);
        }
    }

    const allModules = tenants
        .filter((t) => t.status === 'active' || t.status === 'trial')
        .map((t) => t.businessType);

    userDoc.lastLogin = new Date();
    userDoc.lastLoginIp = req.ip;
    await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        lastLoginIp: req.ip,
    });

    const accessToken = jwt.signAccessToken({
        id: user._id,
        tenantId: tenant._id,
        role: user.role,
        scope,
    });
    const refreshToken = jwt.signRefreshToken({
        id: user._id,
        tenantId: tenant._id,
    });

    auditService
        .log({
            tenantId: tenant._id,
            userId: user._id,
            userModel: getModelName(tenant.businessType),
            action: 'user.login',
            module: tenant.businessType,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        })
        .catch(() => {});

    return sendSuccess(
        res,
        {
            user: {
                id: userDoc._id,
                name: userDoc.name,
                email: userDoc.email,
                phone: userDoc.phone,
                role: userDoc.role,
                tenantId: tenant._id,
                businessName: tenant.businessName,
                businessType: tenant.businessType,
                modules: allModules,
                scope,
            },
            tenant: {
                id: tenant._id,
                businessName: tenant.businessName,
                businessType: tenant.businessType,
                slug: tenant.slug,
                status: tenant.status,
                paymentReceived: tenant.paymentReceived || false,
                contact: tenant.contact,
                owner: tenant.owner,
                settings: tenant.settings,
            },
            invoice,
            scope,
            modules: allModules,
            accessToken,
            refreshToken,
        },
        'Login successful'
    );
});

const scopeIsNotPending = (tenant) =>
    tenant.status !== 'pending' && tenant.status !== 'active' && tenant.status !== 'trial';

/* ═══════════════════════════════════════════════════════
 * LOGOUT
 * ═══════════════════════════════════════════════════════ */
const logout = asyncHandler(async (req, res) => {
    return sendSuccess(res, null, 'Logout successful');
});

/* ═══════════════════════════════════════════════════════
 * ME
 * ═══════════════════════════════════════════════════════ */
const getMe = asyncHandler(async (req, res) => {
    const tenant = req.tenant;
    const user = req.user;

    if (!tenant || !user) {
        return sendError(res, 'Not authenticated', 401);
    }

    const scope = computeScope(tenant, user);
    const User = getUserModel(tenant.businessType);

    const userDoc = await User.findById(user.id || user._id)
        .select('-password -pin')
        .lean();

    if (!userDoc) return sendError(res, 'User not found', 404);

    let invoice = null;
    if (scope === 'pending' || scope === 'paid_wait' || scope === 'expired') {
        const raw = await latestInvoiceForTenant(tenant._id);
        if (raw) {
            const fresh = await buildFreshInstructions(raw);
            invoice = shapeInvoice(raw, fresh);
        }
    }

    const allModules = tenant.businessType ? [tenant.businessType] : [];

    return sendSuccess(res, {
        user: {
            id: userDoc._id,
            name: userDoc.name,
            email: userDoc.email,
            phone: userDoc.phone,
            role: userDoc.role,
            tenantId: tenant._id,
            businessName: tenant.businessName,
            businessType: tenant.businessType,
            scope,
            subscriptionExpiry: userDoc.subscriptionExpiry || null,
        },
        tenant: {
            id: tenant._id,
            businessName: tenant.businessName,
            businessType: tenant.businessType,
            slug: tenant.slug,
            status: tenant.status,
            paymentReceived: tenant.paymentReceived || false,
            contact: tenant.contact,
            owner: tenant.owner,
            settings: tenant.settings,
        },
        invoice,
        scope,
        modules: allModules,
    });
});

/* ═══════════════════════════════════════════════════════
 * REFRESH TOKEN
 * ═══════════════════════════════════════════════════════ */
const refreshTokenHandler = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token required', 400);

    let decoded;
    try {
        decoded = jwt.verifyRefreshToken(refreshToken);
    } catch {
        return sendError(res, 'Invalid refresh token', 401);
    }

    const tenant = await Tenant.findById(decoded.tenantId).lean();
    if (!tenant) return sendError(res, 'Tenant not found', 404);

    const User = getUserModel(tenant.businessType);
    const user = await User.findById(decoded.id).select('-password -pin').lean();
    if (!user) return sendError(res, 'User not found', 404);

    if (tenant.status === 'suspended' || tenant.status === 'rejected') {
        return sendError(res, 'Account is not active', 403);
    }

    const scope = computeScope(tenant, user);

    let invoice = null;
    if (scope === 'pending' || scope === 'paid_wait' || scope === 'expired') {
        const raw = await latestInvoiceForTenant(tenant._id);
        if (raw) {
            const fresh = await buildFreshInstructions(raw);
            invoice = shapeInvoice(raw, fresh);
        }
    }

    const accessToken = jwt.signAccessToken({
        id: user._id,
        tenantId: tenant._id,
        role: user.role,
        scope,
    });
    const newRefreshToken = jwt.signRefreshToken({
        id: user._id,
        tenantId: tenant._id,
    });

    return sendSuccess(
        res,
        {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                tenantId: tenant._id,
                businessName: tenant.businessName,
                businessType: tenant.businessType,
                scope,
            },
            tenant: {
                id: tenant._id,
                businessName: tenant.businessName,
                businessType: tenant.businessType,
                slug: tenant.slug,
                status: tenant.status,
                paymentReceived: tenant.paymentReceived || false,
            },
            invoice,
            scope,
            accessToken,
            refreshToken: newRefreshToken,
        },
        'Token refreshed'
    );
});

/* ═══════════════════════════════════════════════════════
 * FORGOT PASSWORD
 * ═══════════════════════════════════════════════════════ */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email required', 400);

    const genericMsg = 'If that email exists, a reset link has been sent';

    try {
        const tenant = await Tenant.findOne({
            $or: [{ 'owner.email': email }, { 'contact.email': email }],
        });

        if (!tenant) {
            return sendSuccess(res, null, genericMsg);
        }

        const User = getUserModel(tenant.businessType);
        const user = await User.findOne({
            tenantId: tenant._id,
            email,
        });

        if (!user) {
            return sendSuccess(res, null, genericMsg);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();

        const resetUrl = `${
            process.env.CLIENT_URL || 'http://localhost:3000'
        }/reset-password?token=${rawToken}`;

        try {
            await emailService.sendTemplate('passwordReset', email, {
                name: user.name,
                resetUrl,
                token: rawToken,
            });
        } catch (err) {
            logger.error('Password reset email failed:', err.message);
        }

        auditService
            .log({
                tenantId: tenant._id,
                userId: user._id,
                userModel: getModelName(tenant.businessType),
                action: 'auth.forgot_password',
                module: tenant.businessType,
                ipAddress: req.ip,
            })
            .catch(() => {});

        return sendSuccess(res, null, genericMsg);
    } catch (err) {
        logger.error('forgotPassword error:', err.message);
        return sendSuccess(res, null, genericMsg);
    }
});

/* ═══════════════════════════════════════════════════════
 * RESET PASSWORD
 * ═══════════════════════════════════════════════════════ */
const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword, password } = req.body;
    const pwd = newPassword || password;

    if (!token || !pwd) {
        return sendError(res, 'Token and new password required', 400);
    }

    if (pwd.length < 6) {
        return sendError(res, 'Password must be at least 6 characters', 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const tenants = await Tenant.find().lean();
    let foundUser = null;
    let foundTenant = null;

    for (const tenant of tenants) {
        try {
            const User = getUserModel(tenant.businessType);
            const u = await User.findOne({
                tenantId: tenant._id,
                resetPasswordToken: hashedToken,
                resetPasswordExpire: { $gt: new Date() },
            }).select('+password');

            if (u) {
                foundUser = u;
                foundTenant = tenant;
                break;
            }
        } catch {
            /* skip invalid businessType */
        }
    }

    if (!foundUser) {
        return sendError(res, 'Invalid or expired reset token', 400);
    }

    foundUser.password = pwd;
    foundUser.resetPasswordToken = undefined;
    foundUser.resetPasswordExpire = undefined;
    await foundUser.save();

    try {
        await emailService.sendTemplate('passwordChanged', foundUser.email, {
            name: foundUser.name,
        });
    } catch {
        /* silent */
    }

    auditService
        .log({
            tenantId: foundTenant._id,
            userId: foundUser._id,
            userModel: getModelName(foundTenant.businessType),
            action: 'auth.reset_password',
            module: foundTenant.businessType,
            ipAddress: req.ip,
        })
        .catch(() => {});

    return sendSuccess(res, null, 'Password reset successful');
});

/* ═══════════════════════════════════════════════════════
 * VERIFY EMAIL (stub — extend when needed)
 * ═══════════════════════════════════════════════════════ */
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) return sendError(res, 'Token required', 400);

    // Stub: accept the token
    return sendSuccess(res, null, 'Email verified');
});

/* ═══════════════════════════════════════════════════════
 * RESEND VERIFICATION (stub)
 * ═══════════════════════════════════════════════════════ */
const resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email required', 400);

    return sendSuccess(res, null, 'If that email exists, a verification link has been sent');
});

/* ═══════════════════════════════════════════════════════
 * ADMIN LOGIN (bonus — for admin panel if needed)
 * ═══════════════════════════════════════════════════════ */
const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 'Email and password required', 400);

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return sendError(res, 'Invalid credentials', 401);
    if (!admin.isActive) return sendError(res, 'Account deactivated', 403);

    const match = await admin.comparePassword(password);
    if (!match) return sendError(res, 'Invalid credentials', 401);

    admin.lastLogin = new Date();
    await admin.save();

    const accessToken = jwt.signAccessToken({
        id: admin._id,
        role: admin.role,
        isAdmin: true,
    });
    const refreshToken = jwt.signRefreshToken({
        id: admin._id,
        isAdmin: true,
    });

    auditService
        .log({
            userId: admin._id,
            userModel: 'Admin',
            action: 'admin.login',
            module: 'admin',
            ipAddress: req.ip,
        })
        .catch(() => {});

    return sendSuccess(
        res,
        {
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
            },
            accessToken,
            refreshToken,
        },
        'Login successful'
    );
});


module.exports = {
    login,
    logout,
    getMe,
    refreshTokenHandler,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    adminLogin,
    computeScope,
    getUserModel,
    getModelName,
};