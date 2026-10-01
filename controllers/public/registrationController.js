const mongoose = require('mongoose');
const Tenant = require('../../models/admin/Tenant');
const PendingApproval = require('../../models/admin/PendingApproval');
const Admin = require('../../models/admin/Admin');
const Settings = require('../../models/admin/Settings');
const invoiceService = require('../../services/invoiceService');
const planService = require('../../services/planService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const auditService = require('../../utils/auditService');
const jwt = require('../../utils/jwt');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateTenantSlug } = require('../../utils/generateId');
const logger = require('../../utils/logger');

const USER_MODEL_MAP = {
    restaurant: { model: 'RestoUser', path: '../../models/resto/User' },
    pharmacy: { model: 'PharmaUser', path: '../../models/pharma/User' },
    apartment: { model: 'ApartmentUser', path: '../../models/apartment/User' },
    electronics: { model: 'ElectroUser', path: '../../models/electro/User' },
    cyber: { model: 'CyberUser', path: '../../models/cyber/User' },
};

const MODULE_KEY_MAP = {
    restaurant: 'resto',
    pharmacy: 'pharma',
    apartment: 'apartment',
    electronics: 'electro',
    cyber: 'cyber',
};

const getUserModel = (businessType) => {
    const entry = USER_MODEL_MAP[businessType];
    if (!entry) throw new ApiError(400, `Invalid business type: ${businessType}`);
    return require(entry.path);
};

const getUserModelName = (businessType) => {
    const entry = USER_MODEL_MAP[businessType];
    return entry ? entry.model : 'User';
};

const normalizePhone = (phone) => {
    if (!phone) return null;
    let p = String(phone).replace(/\D/g, '');
    if (p.startsWith('0')) p = `254${p.slice(1)}`;
    if (!p.startsWith('254') && p.length === 9) p = `254${p}`;
    return p;
};

const register = asyncHandler(async (req, res) => {
    const {
        businessName, businessType, owner, contact, password,
        plan, planName: planFromBody,
    } = req.body;

    const planRequested = plan || planFromBody;

    if (!businessName || !businessType || !owner || !password) {
        return sendError(res, 'Business name, type, owner, and password are required', 400);
    }

    const validTypes = ['restaurant', 'pharmacy', 'apartment', 'electronics', 'cyber'];
    if (!validTypes.includes(businessType)) {
        return sendError(res, `Invalid business type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    if (!planRequested) {
        return sendError(res, 'Plan is required', 400);
    }

    const settings = await Settings.findOne().lean();
    if (settings?.allowSelfRegistration === false) {
        return sendError(res, 'Registration is currently closed', 403);
    }

    const moduleKey = MODULE_KEY_MAP[businessType];
    const flagKey = `module_${moduleKey}`;
    const moduleFlag = await Settings.findOne({ key: flagKey, category: 'features' }).lean();
    if (moduleFlag && moduleFlag.value === 'false') {
        return sendError(res, `${businessType} module is currently unavailable`, 400);
    }

    const existing = await Tenant.findOne({
        businessType,
        $or: [
            { 'owner.email': owner.email },
            { 'owner.phone': owner.phone },
        ],
    });
    if (existing) {
        return sendError(res, `You already have a ${businessType} business registered`, 409);
    }

    const planDoc = await planService.getByName(planRequested);
    if (!planDoc) {
        return sendError(res, 'Invalid plan', 400);
    }

    const slug = generateTenantSlug(businessName);
    const User = getUserModel(businessType);
    const userModelName = getUserModelName(businessType);
    const normalizedPhone = normalizePhone(owner.phone);

    const session = await mongoose.startSession();
    session.startTransaction();

    let tenant, user, invoice, pendingApproval;

    try {
        [tenant] = await Tenant.create([{
            businessName,
            slug,
            businessType,
            owner: {
                name: owner.name,
                email: owner.email,
                phone: normalizedPhone,
            },
            contact: contact || {
                email: owner.email,
                phone: normalizedPhone,
            },
            status: 'pending',
            paymentReceived: false,
            settings: {
                currency: 'KES',
                timezone: 'Africa/Nairobi',
                dateFormat: 'DD/MM/YYYY',
                planName: planDoc.name,
                planAmount: planDoc.price,
                planCycle: planDoc.cycle,
            },
        }], { session });

        [user] = await User.create([{
            tenantId: tenant._id,
            name: owner.name,
            email: owner.email,
            phone: normalizedPhone,
            password,
            role: 'owner',
            permissions: ['all'],
            isActive: false,
            scope: 'pending',
        }], { session });

        const invResult = await invoiceService.generateInvoice({
            tenantId: tenant._id,
            userId: user._id,
            userModel: userModelName,
            user: { name: owner.name, email: owner.email, phone: normalizedPhone },
            plan: planDoc.name,
            planPrice: planDoc.price,
            planInterval: planDoc.cycle,
            planDoc,
            type: 'registration',
        });
        invoice = invResult.invoice;

        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

        [pendingApproval] = await PendingApproval.create([{
            tenantId: tenant._id,
            userId: user._id,
            userModel: userModelName,
            type: 'registration',
            status: 'pending',
            plan: planDoc.name,
            planCycle: planDoc.cycle,
            amount: planDoc.price,
            currency: 'KES',
            invoice: invoice._id,
            expiresAt,
        }], { session });

        await session.commitTransaction();
    } catch (err) {
        await session.abortTransaction();
        logger.error('Registration failed:', err);
        throw err;
    } finally {
        session.endSession();
    }

    const moduleDisplayName = {
        restaurant: 'RestoManagerKE',
        pharmacy: 'PharmaSys',
        apartment: 'MyApartment',
        electronics: 'ElectroStore',
        cyber: 'DigitalManager',
    }[businessType];

    const invoiceUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/invoice/${invoice.invoiceNumber}`;

    Promise.resolve().then(async () => {
        try {
            await emailService.sendTemplate('tenantRegistrationPending', owner.email, {
                name: owner.name,
                businessName,
                businessType,
                planName: planDoc.name,
                planAmount: planDoc.price,
                invoiceNumber: invoice.invoiceNumber,
                dueDate: invoice.dueDate,
                paymentInstructions: invoice.paymentInstructions || [],
                invoiceUrl,
            });
        } catch (err) {
            logger.error('Registration email failed:', err.message);
        }

        try {
            await smsService.sendTemplate('tenantRegistrationPending', normalizedPhone, {
                name: owner.name,
                businessName,
                planName: planDoc.name,
                amount: planDoc.price,
                invoiceNumber: invoice.invoiceNumber,
            });
        } catch (err) {
            logger.error('Registration SMS failed:', err.message);
        }

        try {
            const admins = await Admin.find({ isActive: true }).lean();
            await Promise.allSettled(admins.map((admin) =>
                emailService.sendTemplate('adminNewRegistration', admin.email, {
                    businessName,
                    ownerName: owner.name,
                    ownerEmail: owner.email,
                    ownerPhone: normalizedPhone,
                    planName: planDoc.name,
                    planCycle: planDoc.cycle,
                    amount: planDoc.price,
                    invoiceNumber: invoice.invoiceNumber,
                    businessType,
                    moduleName: moduleDisplayName,
                })
            ));
        } catch (err) {
            logger.error('Admin notification failed:', err.message);
        }
    }).catch((err) => logger.error('Post-registration async failed:', err.message));

    const accessToken = jwt.signAccessToken({
        id: user._id,
        tenantId: tenant._id,
        role: 'owner',
        scope: 'pending',
    });
    const refreshToken = jwt.signRefreshToken({
        id: user._id,
        tenantId: tenant._id,
    });

    await auditService.log({
        tenantId: tenant._id,
        userId: user._id,
        userModel: userModelName,
        action: 'tenant.registered',
        module: 'admin',
        resource: 'Tenant',
        resourceId: tenant._id,
        details: {
            businessName,
            businessType,
            planName: planDoc.name,
            invoiceNumber: invoice.invoiceNumber,
        },
    });

    return sendSuccess(res, {
        tenant: {
            id: tenant._id,
            businessName: tenant.businessName,
            businessType: tenant.businessType,
            slug: tenant.slug,
            status: tenant.status,
        },
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            scope: 'pending',
        },
        plan: {
            name: planDoc.name,
            price: planDoc.price,
            cycle: planDoc.cycle,
        },
        invoice: {
            invoiceNumber: invoice.invoiceNumber,
            amountDue: invoice.amountDue,
            total: invoice.total,
            currency: invoice.currency,
            dueDate: invoice.dueDate,
            status: invoice.status,
            paymentState: invoice.paymentState,
            paymentInstructions: invoice.paymentInstructions,
            invoiceUrl,
        },
        scope: 'pending',
        accessToken,
        refreshToken,
    }, 'Registration submitted. Please complete payment.', 201);
});

const checkAvailability = asyncHandler(async (req, res) => {
    const { email, phone, businessName } = req.query;
    const result = {};

    if (email) {
        result.emailTaken = !!(await Tenant.findOne({
            $or: [{ 'owner.email': email }, { 'contact.email': email }],
        }));
    }
    if (phone) {
        const normalized = normalizePhone(phone);
        result.phoneTaken = !!(await Tenant.findOne({
            $or: [{ 'owner.phone': normalized }, { 'contact.phone': normalized }],
        }));
    }
    if (businessName) {
        result.nameTaken = !!(await Tenant.findOne({
            businessName: { $regex: new RegExp(`^${businessName}$`, 'i') },
        }));
    }

    return sendSuccess(res, result);
});

module.exports = {
    register,
    checkAvailability,
};