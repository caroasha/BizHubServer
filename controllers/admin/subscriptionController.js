const Subscription = require('../../models/admin/Subscription');
const Tenant = require('../../models/admin/Tenant');
const Module = require('../../models/admin/Module');
const Plans = require('../../models/admin/Plans');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const { formatDate } = require('../../utils/formatters');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, plan } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (plan) filter.plan = plan;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('tenantId', 'businessName businessType owner contact')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  sendPaginated(res, subscriptions, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getById = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id)
    .populate('tenantId', 'businessName businessType owner contact')
    .lean();
  if (!subscription) throw new ApiError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
  sendSuccess(res, subscription);
});

const getByTenant = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ tenantId: req.params.tenantId })
    .sort({ createdAt: -1 })
    .lean();
  sendSuccess(res, subscriptions);
});

const upgrade = asyncHandler(async (req, res) => {
  const { plan, modules } = req.body;
  if (!plan) throw new ApiError(400, 'Plan is required');

  const planDetails = await Plans.findOne({ slug: plan });
  if (!planDetails) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');

  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) throw new ApiError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');

  const tenant = await Tenant.findById(subscription.tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const newSubscription = await Subscription.create({
    tenantId: tenant._id,
    plan,
    amount: planDetails.price,
    currency: 'KES',
    startDate: new Date(),
    endDate,
    status: 'active',
    paymentDetails: { method: 'manual' },
    modules: modules || [],
  });

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  await subscription.save();

  if (modules && modules.length > 0) {
    for (const mod of modules) {
      await Module.findOneAndUpdate(
        { tenantId: tenant._id, moduleName: mod },
        { status: 'active' },
        { upsert: true }
      );
    }
  }

  await AuditLog.create({
    tenantId: tenant._id,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'subscription.upgraded',
    module: 'admin',
    resource: 'Subscription',
    resourceId: newSubscription._id,
    details: { from: subscription.plan, to: plan },
  });

  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.send({
      to: tenant.contact?.email || tenant.owner.email,
      subject: `Subscription Upgraded - ${tenant.businessName}`,
      html: require('../../templates/emailTemplates').subscriptionRenewed({
        name: tenant.owner.name,
        businessName: tenant.businessName,
        plan: planDetails.name,
        amount: planDetails.price,
        nextBillingDate: formatDate(endDate),
      }),
    });
  }

  if (tenant.contact?.phone || tenant.owner?.phone) {
    await smsService.send({
      to: tenant.contact?.phone || tenant.owner.phone,
      message: require('../../templates/smsTemplates').subscriptionRenewed({
        businessName: tenant.businessName,
        plan: planDetails.name,
      }),
    });
  }

  sendSuccess(res, newSubscription, 'Subscription upgraded');
});

const cancel = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id);
  if (!subscription) throw new ApiError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  subscription.cancelReason = req.body.reason || 'Cancelled by admin';
  await subscription.save();

  const tenant = await Tenant.findById(subscription.tenantId);

  await AuditLog.create({
    tenantId: subscription.tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'subscription.cancelled',
    module: 'admin',
    resource: 'Subscription',
    resourceId: subscription._id,
    details: { reason: req.body.reason },
  });

  if (tenant) {
    tenant.status = 'cancelled';
    await tenant.save();
  }

  sendSuccess(res, subscription, 'Subscription cancelled');
});

module.exports = { getAll, getById, getByTenant, upgrade, cancel };