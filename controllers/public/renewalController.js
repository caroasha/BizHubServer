const Tenant = require('../../models/admin/Tenant');
const Subscription = require('../../models/admin/Subscription');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const mpesaService = require('../../services/mpesaService');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const Admin = require('../../models/admin/Admin');

const paymentLabels = {
  momo_stk: 'M-Pesa STK Push',
  momo_send: 'Send Money',
  momo_till: 'Till Number',
  momo_paybill: 'Paybill',
  stripe: 'Card (Stripe)',
  manual: 'Manual',
};

const renew = asyncHandler(async (req, res) => {
  const { tenantId, plan, planName, planAmount, planCycle, paymentMethod, paymentPhone } = req.body;
  if (!tenantId || !plan) throw new ApiError(400, 'Tenant ID and plan required');

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const paymentMethodLabel = paymentLabels[paymentMethod] || paymentMethod;

  // Store plan info in tenant settings for approval
  tenant.settings = {
    ...tenant.settings,
    planName: planName || plan,
    planAmount: planAmount || 0,
    planCycle: planCycle || 'monthly',
    paymentMethod: paymentMethod || 'manual',
  };
  tenant.markModified('settings');
  await tenant.save();

  // Create pending subscription
  await Subscription.create({
    tenantId: tenant._id,
    plan: (planName || plan).toLowerCase(),
    amount: planAmount || 0,
    currency: 'KES',
    startDate: new Date(),
    endDate: new Date(),
    status: 'pending',
    paymentDetails: {
      method: paymentMethod || 'manual',
      phone: paymentPhone,
    },
  });

  await AuditLog.create({
    tenantId: tenant._id,
    action: 'subscription.renewal_requested',
    module: 'admin',
    resource: 'Subscription',
    details: { plan: planName, amount: planAmount, cycle: planCycle, paymentMethod },
  });

  // Send emails
  if (tenant.contact?.email || tenant.owner?.email) {
    await emailService.sendSubscriptionReceived(
      tenant.contact?.email || tenant.owner.email,
      tenant.owner.name,
      tenant.businessName,
      planName || plan,
      planAmount || 0,
      tenant.businessType
    );
  }

  // Notify admins
  const admins = await Admin.find({ role: 'super_admin', isActive: true });
  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  for (const admin of admins) {
    if (admin.email) {
      await emailService.sendNewSubscriptionAdmin(admin.email, {
        businessName: tenant.businessName,
        ownerName: tenant.owner.name,
        ownerEmail: tenant.owner.email,
        ownerPhone: tenant.owner.phone,
        plan: planName || plan,
        amount: planAmount || 0,
        planCycle: planCycle || 'monthly',
        paymentMethod: paymentMethodLabel,
        modules: tenant.businessType,
        businessType: tenant.businessType,
        date: today,
      });
    }
  }

  sendSuccess(res, {
    message: 'Renewal request submitted. Awaiting approval.',
    tenant: { id: tenant._id, businessName: tenant.businessName, status: tenant.status },
  }, 'Renewal submitted', 201);
});

module.exports = { renew };