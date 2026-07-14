const Tenant = require('../../models/admin/Tenant');
const Settings = require('../../models/admin/Settings');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const { generateTenantSlug } = require('../../utils/generateId');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const Admin = require('../../models/admin/Admin');

const MODULES_LIST = [
  { type: 'restaurant', name: 'RestoManagerKE' },
  { type: 'pharmacy', name: 'PharmaSys' },
  { type: 'apartment', name: 'MyApartment' },
  { type: 'electronics', name: 'ElectroStore' },
  { type: 'cyber', name: 'DigitalManager' },
];

const paymentLabels = {
  momo_stk: 'M-Pesa STK Push',
  momo_send: 'Send Money',
  momo_till: 'Till Number',
  momo_paybill: 'Paybill',
  stripe: 'Card (Stripe)',
  manual: 'Manual',
};

const modelNames = {
  restaurant: 'RestoUser',
  pharmacy: 'PharmaUser',
  apartment: 'ApartmentUser',
  electronics: 'ElectroUser',
  cyber: 'CyberUser',
};

const getUserModel = (businessType) => {
  const models = {
    restaurant: require('../../models/resto/User'),
    pharmacy: require('../../models/pharma/User'),
    apartment: require('../../models/apartment/User'),
    electronics: require('../../models/electro/User'),
    cyber: require('../../models/cyber/User'),
  };
  return models[businessType];
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
};

const register = asyncHandler(async (req, res) => {
  const { businessName, businessType, owner, contact, password } = req.body;
  if (!businessName || !businessType || !owner || !password) {
    throw new ApiError(400, 'Business name, type, owner details, and password required');
  }

  const validTypes = ['restaurant', 'pharmacy', 'apartment', 'electronics', 'cyber'];
  if (!validTypes.includes(businessType)) {
    throw new ApiError(400, `Invalid business type. Must be: ${validTypes.join(', ')}`);
  }

  const moduleKeyMap = {
    restaurant: 'module_resto',
    pharmacy: 'module_pharma',
    apartment: 'module_apartment',
    electronics: 'module_electro',
    cyber: 'module_cyber',
  };

  const flagKey = moduleKeyMap[businessType];
  const moduleFlag = await Settings.findOne({ key: flagKey, category: 'features' });

  if (moduleFlag && moduleFlag.value === 'false') {
    throw new ApiError(400, `${businessType} module is currently unavailable`, 'MODULE_UNAVAILABLE');
  }

  const existingTenant = await Tenant.findOne({
    businessType,
    $or: [
      { 'owner.email': owner.email },
      { 'owner.phone': owner.phone },
    ],
  });

  if (existingTenant) {
    throw new ApiError(409, `You already have a ${businessType} business registered.`, 'DUPLICATE_MODULE');
  }

  const slug = generateTenantSlug(businessName);
  const isTrial = req.body.isTrial === true;
  const tenantStatus = isTrial ? 'trial' : 'pending';
  const planName = req.body.planName || 'Pending';
  const planAmount = req.body.planAmount || 0;
  const planCycle = req.body.planCycle || 'monthly';
  const paymentMethod = req.body.paymentMethod || 'manual';
  const paymentMethodLabel = paymentLabels[paymentMethod] || paymentMethod;
  const paymentPhone = req.body.paymentPhone || owner.phone;
  const moduleName = MODULES_LIST.find(m => m.type === businessType)?.name || businessType;

  const tenant = await Tenant.create({
    businessName,
    slug,
    businessType,
    owner,
    contact: contact || owner,
    status: tenantStatus,
    settings: {
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      dateFormat: 'DD/MM/YYYY',
      planName,
      planAmount,
      planCycle,
      paymentMethod,
    },
  });

  const User = getUserModel(businessType);
  const user = await User.create({
    tenantId: tenant._id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    password,
    role: 'owner',
    permissions: ['all'],
    isActive: true,
  });

  await AuditLog.create({
    tenantId: tenant._id,
    userId: user._id,
    userModel: modelNames[businessType],
    action: isTrial ? 'tenant.trial_started' : 'tenant.registered',
    module: 'admin',
    resource: 'Tenant',
    resourceId: tenant._id,
    details: { businessName, businessType, isTrial, planName, planAmount, planCycle, paymentMethod },
  });

  if (isTrial) {
    const Subscription = require('../../models/admin/Subscription');
    const Module = require('../../models/admin/Module');

    const startDate = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    await Subscription.create({
      tenantId: tenant._id,
      plan: 'trial',
      amount: 0,
      currency: 'KES',
      startDate,
      endDate: trialEnd,
      status: 'active',
      paymentDetails: { method: 'trial' },
    });

    await Module.create({
      tenantId: tenant._id,
      moduleName: moduleKeyMap[businessType].replace('module_', ''),
      status: 'active',
      features: { pos: true, inventory: true, reports: true, mpesa: true },
    });

    if (owner.email) {
      await emailService.sendAccountActivated(
        owner.email, owner.name, businessName, 'Starter', moduleName,
        formatDate(startDate), formatDate(trialEnd)
      );
    }
    if (owner.phone) {
      await smsService.sendAccountActivated(owner.phone, owner.name, businessName);
    }

    return sendSuccess(res, {
      tenant: { id: tenant._id, businessName, slug, status: tenantStatus },
      message: 'Your free trial is active! You can login now.',
    }, 'Registration successful', 201);
  }

  // PAID
  if (paymentMethod === 'momo_stk' && paymentPhone) {
    const mpesaService = require('../../services/mpesaService');
    const stkResult = await mpesaService.stkPush({
      phone: paymentPhone,
      amount: planAmount,
      accountRef: businessName.substring(0, 12),
      description: `${planName} Subscription`,
    });

    if (stkResult.success) {
      const Subscription = require('../../models/admin/Subscription');
      await Subscription.create({
        tenantId: tenant._id,
        plan: planName.toLowerCase(),
        amount: planAmount,
        currency: 'KES',
        startDate: new Date(),
        endDate: new Date(),
        status: 'pending',
        paymentDetails: {
          method: 'mpesa',
          checkoutRequestId: stkResult.checkoutRequestId,
          merchantRequestId: stkResult.merchantRequestId,
          phone: paymentPhone,
        },
        modules: [moduleKeyMap[businessType].replace('module_', '')],
      });

      return sendSuccess(res, {
        tenant: { id: tenant._id, businessName, slug, status: tenantStatus },
        checkoutRequestId: stkResult.checkoutRequestId,
        message: 'M-Pesa payment request sent. Check your phone.',
      }, 'Awaiting payment', 201);
    }
  }

  if (owner.email) {
    await emailService.sendSubscriptionReceived(
      owner.email, owner.name, businessName, planName, planAmount, moduleName, planCycle, paymentMethodLabel
    );
  }
  if (owner.phone) {
    await smsService.sendRegistrationConfirmation(owner.phone, owner.name);
  }

  const admins = await Admin.find({ role: 'super_admin', isActive: true });
  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  for (const admin of admins) {
    if (admin.email) {
      await emailService.sendNewSubscriptionAdmin(admin.email, {
        businessName, ownerName: owner.name, ownerEmail: owner.email,
        ownerPhone: owner.phone, plan: planName, amount: planAmount,
        planCycle, paymentMethod: paymentMethodLabel, modules: moduleName, businessType, date: today,
      });
    }
    if (admin.phone) {
      await smsService.sendNewRegistrationAdmin(admin.phone, businessName, planName, owner.name);
    }
  }

  sendSuccess(res, {
    tenant: { id: tenant._id, businessName, slug, status: tenantStatus },
    message: 'Registration submitted. Awaiting approval.',
  }, 'Registration submitted', 201);
});

const checkAvailability = asyncHandler(async (req, res) => {
  const { email, phone, businessName } = req.query;
  const result = {};

  if (email) {
    result.emailTaken = !!(await Tenant.findOne({ $or: [{ 'owner.email': email }, { 'contact.email': email }] }));
  }
  if (phone) {
    result.phoneTaken = !!(await Tenant.findOne({ $or: [{ 'owner.phone': phone }, { 'contact.phone': phone }] }));
  }
  if (businessName) {
    result.nameTaken = !!(await Tenant.findOne({ businessName: { $regex: new RegExp(`^${businessName}$`, 'i') } }));
  }

  sendSuccess(res, result);
});

module.exports = { register, checkAvailability };