const ApartmentSettings = require('../../models/apartment/Settings');
const Tenant = require('../../models/admin/Tenant');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getSettings = asyncHandler(async (req, res) => {
  let settings = await ApartmentSettings.findOne({ tenantId: req.tenant._id }).lean();
  if (!settings) settings = await ApartmentSettings.create({ tenantId: req.tenant._id });
  const tenant = await Tenant.findById(req.tenant._id).select('businessName contact owner').lean();

  sendSuccess(res, {
    general: {
      companyName: settings.general?.companyName || tenant?.businessName || '',
      phone: settings.general?.phone || tenant?.contact?.phone || tenant?.owner?.phone || '',
      email: settings.general?.email || tenant?.contact?.email || tenant?.owner?.email || '',
      address: settings.general?.address || tenant?.contact?.address || '',
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
  let settings = await ApartmentSettings.findOne({ tenantId: req.tenant._id }) || new ApartmentSettings({ tenantId: req.tenant._id });
  Object.assign(settings.general, req.body);
  settings.updatedBy = req.user?.id;
  await settings.save();
  sendSuccess(res, null, 'Updated');
});

const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, req.body, 'Profile updated');
});

const updatePassword = asyncHandler(async (req, res) => {
  sendSuccess(res, null, 'Password changed');
});

const updatePreferences = asyncHandler(async (req, res) => {
  let settings = await ApartmentSettings.findOne({ tenantId: req.tenant._id }) || new ApartmentSettings({ tenantId: req.tenant._id });
  Object.assign(settings.preferences, req.body);
  settings.updatedBy = req.user?.id;
  await settings.save();
  sendSuccess(res, null, 'Preferences updated');
});

module.exports = { getSettings, updateGeneral, updateProfile, updatePassword, updatePreferences };