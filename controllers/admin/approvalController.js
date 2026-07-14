const Tenant = require('../../models/admin/Tenant');
const Subscription = require('../../models/admin/Subscription');
const Module = require('../../models/admin/Module');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');

const paymentLabels = {
  momo_stk: 'M-Pesa STK Push', momo_send: 'Send Money',
  momo_till: 'Till Number', momo_paybill: 'Paybill',
  stripe: 'Card (Stripe)', manual: 'Manual',
};

const moduleDisplayNames = {
  restaurant: 'RestoManagerKE', pharmacy: 'PharmaSys',
  apartment: 'MyApartment', electronics: 'ElectroStore', cyber: 'DigitalManager',
};

const formatDate = (date) => date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

// ---- NEW REGISTRATIONS ----
const getNew = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [tenants, total] = await Promise.all([
    Tenant.find({ status: 'pending' }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Tenant.countDocuments({ status: 'pending' }),
  ]);

  const data = tenants.map(t => ({
    ...t,
    type: 'new',
    planName: t.settings?.planName || 'N/A',
    planAmount: t.settings?.planAmount || 0,
    planCycle: t.settings?.planCycle || 'N/A',
    planPaymentMethod: paymentLabels[t.settings?.paymentMethod] || t.settings?.paymentMethod || 'Manual',
    moduleName: moduleDisplayNames[t.businessType] || t.businessType,
  }));

  sendPaginated(res, data, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

// ---- RENEWALS ----
const getRenewals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Find tenants with pending subscriptions (renewals)
  const pendingSubs = await Subscription.find({ status: 'pending' }).distinct('tenantId');
  
  const filter = { _id: { $in: pendingSubs }, status: { $in: ['trial_ended', 'cancelled', 'active'] } };

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Tenant.countDocuments(filter),
  ]);

  const tenantIds = tenants.map(t => t._id);
  const subscriptions = await Subscription.find({ tenantId: { $in: tenantIds }, status: 'pending' }).lean();
  const subMap = {};
  subscriptions.forEach(s => { subMap[s.tenantId.toString()] = s; });

  const data = tenants.map(t => ({
    ...t,
    type: 'renewal',
    subscription: subMap[t._id.toString()] || null,
    planName: t.settings?.planName || 'N/A',
    planAmount: t.settings?.planAmount || 0,
    planCycle: t.settings?.planCycle || 'N/A',
    planPaymentMethod: paymentLabels[t.settings?.paymentMethod] || t.settings?.paymentMethod || 'Manual',
    moduleName: moduleDisplayNames[t.businessType] || t.businessType,
  }));

  sendPaginated(res, data, { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit), totalResults: total });
});

// ---- APPROVE (works for both new and renewal) ----
const approve = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const planName = tenant.settings?.planName || 'Business';
  const planAmount = tenant.settings?.planAmount || 0;
  const planCycle = tenant.settings?.planCycle || 'monthly';
  const paymentMethod = tenant.settings?.paymentMethod || 'manual';
  const businessType = tenant.businessType;

  const moduleKeyMap = { restaurant: 'resto', pharmacy: 'pharma', apartment: 'apartment', electronics: 'electro', cyber: 'cyber' };
  const moduleName = moduleKeyMap[businessType] || businessType;

  const startDate = new Date();
  let endDate = new Date();
  switch (planCycle) {
    case 'monthly': endDate.setMonth(endDate.getMonth() + 1); break;
    case 'yearly': endDate.setFullYear(endDate.getFullYear() + 1); break;
    case 'permanent': endDate = new Date('2099-12-31'); break;
    default: endDate.setMonth(endDate.getMonth() + 1);
  }

  // Update tenant status
  const wasTrialEnded = tenant.status === 'trial_ended';
  tenant.status = 'active';
  tenant.approvedBy = req.admin._id;
  tenant.approvedAt = new Date();
  await tenant.save();

  // Activate pending subscription or create new one
  const existingSub = await Subscription.findOne({ tenantId: tenant._id, status: 'pending' });
  if (existingSub) {
    existingSub.status = 'active';
    existingSub.plan = planName.toLowerCase();
    existingSub.amount = planAmount;
    existingSub.startDate = startDate;
    existingSub.endDate = endDate;
    existingSub.paymentDetails = { ...existingSub.paymentDetails, method: paymentMethod };
    await existingSub.save();
  } else {
    // Deactivate old subscriptions
    await Subscription.updateMany({ tenantId: tenant._id, status: 'active' }, { status: 'expired' });
    await Subscription.create({
      tenantId: tenant._id, plan: planName.toLowerCase(), amount: planAmount,
      currency: 'KES', startDate, endDate, status: 'active',
      paymentDetails: { method: paymentMethod }, modules: [moduleName],
    });
  }

  // Ensure module is active
  const existingModule = await Module.findOne({ tenantId: tenant._id, moduleName });
  if (!existingModule) {
    await Module.create({ tenantId: tenant._id, moduleName, status: 'active', features: { pos: true, inventory: true, reports: true, mpesa: true } });
  } else {
    existingModule.status = 'active';
    await existingModule.save();
  }

  await AuditLog.create({
    tenantId: tenant._id, userId: req.admin._id, userModel: 'Admin',
    action: wasTrialEnded ? 'renewal.approved' : 'tenant.approved',
    module: 'admin', resource: 'Tenant', resourceId: tenant._id,
    details: { planName, planAmount, planCycle, paymentMethod },
  });

  const moduleDisplayName = moduleDisplayNames[businessType] || businessType;

  // Send activation email
  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.sendAccountActivated(
      tenant.contact?.email || tenant.owner.email,
      tenant.owner.name, tenant.businessName,
      planName, moduleDisplayName,
      formatDate(startDate), formatDate(endDate)
    );
  }
  if (tenant.contact?.phone || tenant.owner?.phone) {
    await smsService.sendAccountActivated(tenant.contact?.phone || tenant.owner.phone, tenant.owner.name, tenant.businessName);
  }

  sendSuccess(res, tenant, 'Approved and activated');
});

const reject = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');
  const { reason } = req.body;

  await Subscription.deleteMany({ tenantId: tenant._id, status: 'pending' });

  await AuditLog.create({
    tenantId: tenant._id, userId: req.admin._id, userModel: 'Admin',
    action: 'request.rejected', module: 'admin', resource: 'Tenant', resourceId: tenant._id,
    details: { reason },
  });

  // Don't delete the tenant — just clear pending subs
  sendSuccess(res, null, 'Request rejected');
});

const bulkApprove = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) throw new ApiError(400, 'IDs array required');
  let approved = 0, failed = 0;
  for (const id of ids) {
    try { req.params.id = id; await approve(req, res); approved++; } catch { failed++; }
  }
  sendSuccess(res, { approved, failed }, `Approved ${approved}, failed ${failed}`);
});

module.exports = { getNew, getRenewals, approve, reject, bulkApprove };