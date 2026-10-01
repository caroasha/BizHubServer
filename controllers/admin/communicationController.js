const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

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

const sendToUser = asyncHandler(async (req, res) => {
  const { tenantId, userId, subject, message, channel } = req.body;
  if (!tenantId || !userId || !subject || !message) {
    throw new ApiError(400, 'Tenant ID, user ID, subject, and message required');
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  const results = { email: null, sms: null };

  if (!channel || channel === 'email') {
    if (user.email) {
      results.email = await emailService.send({
        to: user.email,
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2>${subject}</h2><p>${message}</p><hr><p style="color:#64748b;font-size:12px;">Sent by BizHub Admin</p></div>`,
      });
    }
  }

  if (channel === 'sms' || channel === 'both') {
    if (user.phone) {
      results.sms = await smsService.send({ to: user.phone, message: `${subject}: ${message}` });
    }
  }

  await AuditLog.create({
    tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'communication.user',
    module: 'admin',
    details: { userId, subject, channel },
  });

  sendSuccess(res, results, 'Message sent');
});

const sendToAllUsers = asyncHandler(async (req, res) => {
  const { subject, message, channel } = req.body;
  if (!subject || !message) throw new ApiError(400, 'Subject and message required');

  const tenants = await Tenant.find({ status: { $in: ['active', 'trial'] } });
  let emailSent = 0, emailFailed = 0, smsSent = 0, smsFailed = 0;

  for (const tenant of tenants) {
    try {
      const User = getUserModel(tenant.businessType);
      const users = await User.find({ tenantId: tenant._id, isActive: true });

      for (const user of users) {
        if (!channel || channel === 'email') {
          if (user.email) {
            const result = await emailService.send({
              to: user.email,
              subject,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2>${subject}</h2><p>${message}</p><hr><p style="color:#64748b;font-size:12px;">Sent by BizHub Admin to all users</p></div>`,
            });
            result.success ? emailSent++ : emailFailed++;
          }
        }

        if (channel === 'sms' || channel === 'both') {
          if (user.phone) {
            const result = await smsService.send({ to: user.phone, message: `${subject}: ${message}` });
            result.success ? smsSent++ : smsFailed++;
          }
        }
      }
    } catch (err) {
      emailFailed++;
    }
  }

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'communication.all_users',
    module: 'admin',
    details: { subject, emailSent, emailFailed, smsSent, smsFailed },
  });

  sendSuccess(res, { emailSent, emailFailed, smsSent, smsFailed }, 'Broadcast complete');
});

const sendToModuleUsers = asyncHandler(async (req, res) => {
  const { module, subject, message, channel } = req.body;
  if (!module || !subject || !message) throw new ApiError(400, 'Module, subject, and message required');

  const businessTypeMap = {
    resto: 'restaurant',
    pharma: 'pharmacy',
    apartment: 'apartment',
    electro: 'electronics',
    cyber: 'cyber',
  };

  const businessType = businessTypeMap[module];
  if (!businessType) throw new ApiError(400, 'Invalid module');

  const tenants = await Tenant.find({ businessType, status: { $in: ['active', 'trial'] } });
  let emailSent = 0, emailFailed = 0, smsSent = 0, smsFailed = 0;

  for (const tenant of tenants) {
    try {
      const User = getUserModel(tenant.businessType);
      const users = await User.find({ tenantId: tenant._id, isActive: true });

      for (const user of users) {
        if (!channel || channel === 'email') {
          if (user.email) {
            const result = await emailService.send({
              to: user.email,
              subject,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2>${subject}</h2><p>${message}</p><hr><p style="color:#64748b;font-size:12px;">Sent by BizHub - ${module.toUpperCase()} Module</p></div>`,
            });
            result.success ? emailSent++ : emailFailed++;
          }
        }

        if (channel === 'sms' || channel === 'both') {
          if (user.phone) {
            const result = await smsService.send({ to: user.phone, message: `${subject}: ${message}` });
            result.success ? smsSent++ : smsFailed++;
          }
        }
      }
    } catch (err) {
      emailFailed++;
    }
  }

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'communication.module_users',
    module: 'admin',
    details: { module, subject, emailSent, emailFailed, smsSent, smsFailed },
  });

  sendSuccess(res, { module, emailSent, emailFailed, smsSent, smsFailed }, `Sent to ${module} users`);
});

const sendToModuleSpecificUsers = asyncHandler(async (req, res) => {
  const { tenantId, module, userIds, subject, message, channel } = req.body;
  if (!tenantId || !module || !userIds || !subject || !message) {
    throw new ApiError(400, 'Tenant ID, module, user IDs, subject, and message required');
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const users = await User.find({ _id: { $in: userIds }, tenantId, isActive: true });

  let emailSent = 0, emailFailed = 0, smsSent = 0, smsFailed = 0;

  for (const user of users) {
    if (!channel || channel === 'email') {
      if (user.email) {
        const result = await emailService.send({
          to: user.email,
          subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2>${subject}</h2><p>${message}</p><hr><p style="color:#64748b;font-size:12px;">Sent by ${tenant.businessName}</p></div>`,
        });
        result.success ? emailSent++ : emailFailed++;
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (user.phone) {
        const result = await smsService.send({ to: user.phone, message: `${subject}: ${message}` });
        result.success ? smsSent++ : smsFailed++;
      }
    }
  }

  await AuditLog.create({
    tenantId,
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'communication.module_specific',
    module: 'admin',
    details: { tenantId, module, userIds, subject, emailSent, smsSent },
  });

  sendSuccess(res, { emailSent, emailFailed, smsSent, smsFailed }, `Sent to ${users.length} users`);
});

const sendCustomEmail = asyncHandler(async (req, res) => {
  const { to, cc, bcc, subject, html, channel } = req.body;
  if (!to || !subject || !html) throw new ApiError(400, 'Recipient, subject, and HTML content required');

  const results = { email: null, sms: null };

  if (!channel || channel === 'email') {
    results.email = await emailService.send({ to, subject, html });
  }

  if (channel === 'sms' || channel === 'both') {
    results.sms = await smsService.send({ to, message: `${subject}: ${html.replace(/<[^>]*>/g, '').substring(0, 160)}` });
  }

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'communication.custom',
    module: 'admin',
    details: { to, subject, channel },
  });

  sendSuccess(res, results, 'Custom message sent');
});

const getTenantUsers = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.params.tenantId);
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND');

  const User = getUserModel(tenant.businessType);
  const users = await User.find({ tenantId: tenant._id }).select('name email phone role isActive').lean();

  sendSuccess(res, users);
});

module.exports = { sendToUser, sendToAllUsers, sendToModuleUsers, sendToModuleSpecificUsers, sendCustomEmail, getTenantUsers };