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
  momo_stk: 'M-Pesa STK Push',
  momo_send: 'Send Money',
  momo_till: 'Till Number',
  momo_paybill: 'Paybill',
  stripe: 'Card (Stripe)',
  manual: 'Manual',
};

const moduleDisplayNames = {
  restaurant: 'RestoManagerKE',
  pharmacy: 'PharmaSys',
  apartment: 'MyApartment',
  electronics: 'ElectroStore',
  cyber: 'DigitalManager',
};

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, businessType, search } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (businessType) filter.businessType = businessType;
  if (search) {
    filter.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { 'owner.email': { $regex: search, $options: 'i' } },
      { 'owner.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const [tenants, total] = await Promise.all([
    Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Tenant.countDocuments(filter),
  ]);

  const tenantIds = tenants.map(t => t._id);
  const subscriptions = await Subscription.find({ tenantId: { $in: tenantIds } }).lean();
  const subMap = {};
  subscriptions.forEach(s => { subMap[s.tenantId.toString()] = s; });

  const data = tenants.map(t => ({
    ...t,
    subscription: subMap[t._id.toString()] || null,
    planInfo: {
      name: t.settings?.planName || 'N/A',
      amount: t.settings?.planAmount || 0,
      cycle: t.settings?.planCycle || 'N/A',
      paymentMethod: paymentLabels[t.settings?.paymentMethod] || t.settings?.paymentMethod || 'Manual',
    },
    moduleName: moduleDisplayNames[t.businessType] || t.businessType,
  }));

  sendPaginated(res, data, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id }).lean();
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const [subscription, modules] = await Promise.all([
    Subscription.findOne({ tenantId: tenant._id }).lean(),
    Module.find({ tenantId: tenant._id }).lean(),
  ]);

  sendSuccess(res, {
    ...tenant,
    subscription,
    modules,
    planInfo: {
      name: tenant.settings?.planName || 'N/A',
      amount: tenant.settings?.planAmount || 0,
      cycle: tenant.settings?.planCycle || 'N/A',
      paymentMethod: paymentLabels[tenant.settings?.paymentMethod] || tenant.settings?.paymentMethod || 'Manual',
    },
    moduleName: moduleDisplayNames[tenant.businessType] || tenant.businessType,
  });
});

const update = asyncHandler(async (req, res) => {
  const { businessName, contact, settings } = req.body;
  const tenant = await Tenant.findOne({ _id: req.params.id });
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  if (businessName) tenant.businessName = businessName;
  if (contact) tenant.contact = { ...tenant.contact, ...contact };
  if (settings) tenant.settings = { ...tenant.settings, ...settings };

  await tenant.save();

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'tenant.updated',
    module: 'admin',
    resource: 'Tenant',
    resourceId: tenant._id,
    details: req.body,
  });

  sendSuccess(res, tenant, 'Tenant updated');
});

const suspend = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id });
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');
  if (tenant.status === 'suspended') throw new ApiError(400, 'Tenant already suspended');

  tenant.status = 'suspended';
  await tenant.save();

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'tenant.suspended',
    module: 'admin',
    resource: 'Tenant',
    resourceId: tenant._id,
  });

  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.sendAccountSuspended(tenant.contact?.email || tenant.owner.email, {
      name: tenant.owner.name,
      businessName: tenant.businessName,
    });
  }
  if (tenant.contact?.phone || tenant.owner?.phone) {
    await smsService.sendAccountSuspended(tenant.contact?.phone || tenant.owner.phone, tenant.businessName);
  }

  sendSuccess(res, tenant, 'Tenant suspended');
});

const activate = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id });
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  tenant.status = 'active';
  await tenant.save();

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'tenant.activated',
    module: 'admin',
    resource: 'Tenant',
    resourceId: tenant._id,
  });

  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.sendAccountReactivated(tenant.contact?.email || tenant.owner.email, {
      name: tenant.owner.name,
      businessName: tenant.businessName,
    });
  }
  if (tenant.contact?.phone || tenant.owner?.phone) {
    await smsService.sendAccountReactivated(tenant.contact?.phone || tenant.owner.phone, tenant.businessName);
  }

  sendSuccess(res, tenant, 'Tenant activated');
});

const remove = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id });
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const tenantId = tenant._id;
  await Promise.all([
    Subscription.deleteMany({ tenantId }),
    Module.deleteMany({ tenantId }),
    AuditLog.deleteMany({ tenantId }),
    Tenant.deleteOne({ _id: tenantId }),
  ]);

  sendSuccess(res, null, 'Tenant deleted');
});

const getStats = asyncHandler(async (req, res) => {
  const [total, active, trial, suspended, pending] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ status: 'active' }),
    Tenant.countDocuments({ status: 'trial' }),
    Tenant.countDocuments({ status: 'suspended' }),
    Tenant.countDocuments({ status: 'pending' }),
  ]);

  sendSuccess(res, { total, active, trial, suspended, pending });
});

module.exports = { getAll, getById, update, suspend, activate, remove, getStats };