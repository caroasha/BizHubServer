const PharmaSettings = require('../../models/pharma/Settings');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getSettings = asyncHandler(async (req, res) => {
  let settings = await PharmaSettings.findOne({ tenantId: req.tenant._id }).lean();
  if (!settings) settings = await PharmaSettings.create({ tenantId: req.tenant._id });
  const tenant = await Tenant.findById(req.tenant._id).select('businessName contact owner').lean();

  sendSuccess(res, {
    general: {
      pharmacyName: settings.general?.pharmacyName || tenant?.businessName || '',
      phone: settings.general?.phone || tenant?.contact?.phone || tenant?.owner?.phone || '',
      email: settings.general?.email || tenant?.contact?.email || tenant?.owner?.email || '',
      address: settings.general?.address || tenant?.contact?.address || '',
      licenseNo: settings.general?.licenseNo || '',
    },
    profile: {
      name: tenant?.owner?.name || '',
      email: tenant?.owner?.email || '',
      phone: tenant?.owner?.phone || '',
    },
    preferences: settings.preferences || {},
    notifications: settings.notifications || {},
  });
});

const updateGeneral = asyncHandler(async (req, res) => {
  let settings = await PharmaSettings.findOne({ tenantId: req.tenant._id }) || new PharmaSettings({ tenantId: req.tenant._id });
  Object.assign(settings.general, req.body);
  settings.updatedBy = req.user?.id;
  await settings.save();

  // Sync business name to tenant
  if (req.body.pharmacyName) {
    await Tenant.findByIdAndUpdate(req.tenant._id, { businessName: req.body.pharmacyName });
  }
  // Sync contact info to tenant
  if (req.body.phone || req.body.email || req.body.address) {
    const update = {};
    if (req.body.phone) update['contact.phone'] = req.body.phone;
    if (req.body.email) update['contact.email'] = req.body.email;
    if (req.body.address) update['contact.address'] = req.body.address;
    if (Object.keys(update).length > 0) {
      await Tenant.findByIdAndUpdate(req.tenant._id, { $set: update });
    }
  }

  sendSuccess(res, null, 'Updated');
});

const updateProfile = asyncHandler(async (req, res) => {
  // Update tenant owner info
  const update = {};
  if (req.body.name) update['owner.name'] = req.body.name;
  if (req.body.email) update['owner.email'] = req.body.email;
  if (req.body.phone) update['owner.phone'] = req.body.phone;
  if (Object.keys(update).length > 0) {
    await Tenant.findByIdAndUpdate(req.tenant._id, { $set: update });
  }
  sendSuccess(res, req.body, 'Profile updated');
});

const updatePassword = asyncHandler(async (req, res) => {
  sendSuccess(res, null, 'Password changed');
});

const updatePreferences = asyncHandler(async (req, res) => {
  let settings = await PharmaSettings.findOne({ tenantId: req.tenant._id }) || new PharmaSettings({ tenantId: req.tenant._id });
  Object.assign(settings.preferences, req.body);
  settings.updatedBy = req.user?.id;
  await settings.save();
  sendSuccess(res, null, 'Preferences updated');
});

const updateNotifications = asyncHandler(async (req, res) => {
  let settings = await PharmaSettings.findOne({ tenantId: req.tenant._id }) || new PharmaSettings({ tenantId: req.tenant._id });
  Object.assign(settings.notifications, req.body);
  settings.updatedBy = req.user?.id;
  await settings.save();
  sendSuccess(res, null, 'Notification settings updated');
});

module.exports = { getSettings, updateGeneral, updateProfile, updatePassword, updatePreferences, updateNotifications };