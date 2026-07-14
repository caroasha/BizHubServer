const RestoSettings = require('../../models/resto/Settings');
const RestoUser = require('../../models/resto/User');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

// ============================================
// Helper: Get or Create Settings
// ============================================
const getOrCreate = async (tenantId) => {
  let settings = await RestoSettings.findOne({ tenantId });
  
  if (!settings) {
    const Tenant = require('../../models/admin/Tenant');
    const tenant = await Tenant.findById(tenantId).lean();
    
    settings = await RestoSettings.create({ 
      tenantId,
      general: {
        restaurantName: tenant?.businessName || null,
        phone: tenant?.contact?.phone || null,
        email: tenant?.contact?.email || null,
        address: tenant?.address || null,
        kraPin: tenant?.kraPin || null,
      },
      preferences: {
        currency: tenant?.settings?.currency || 'KES',
        dateFormat: tenant?.settings?.dateFormat || 'DD/MM/YYYY',
        timezone: tenant?.settings?.timezone || 'Africa/Nairobi',
        vatRate: 16,
        serviceCharge: 0,
        receiptFooter: null,
      },
      notifications: {
        orderEmail: true,
        orderSms: true,
        lowStockEmail: true,
        lowStockSms: false,
        reservationEmail: true,
        reservationSms: true,
      },
      openingHours: {
        weekdays: '8:00 AM - 10:00 PM',
        weekends: '9:00 AM - 11:00 PM',
      },
    });
  }
  
  return settings;
};

// ============================================
// Helper: Get User Profile (with fallback)
// ============================================
const getUserProfile = async (userId, tenantId) => {
  // Try to get from RestoUser first
  let user = await RestoUser.findById(userId).select('-password -pin').lean();
  
  // If not found, fallback to tenant data
  if (!user) {
    const Tenant = require('../../models/admin/Tenant');
    const tenant = await Tenant.findById(tenantId).lean();
    user = {
      name: tenant?.owner?.name || tenant?.contact?.name || '',
      email: tenant?.contact?.email || '',
      phone: tenant?.contact?.phone || '',
    };
  }
  
  return user;
};

// ============================================
// Get Settings (with User Profile)
// ============================================
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreate(req.tenant._id);
  const user = await getUserProfile(req.user.id, req.tenant._id);

  sendSuccess(res, {
    general: settings.general || {},
    profile: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
    preferences: settings.preferences || {},
    notifications: settings.notifications || {},
    openingHours: settings.openingHours || {},
  });
});

// ============================================
// Update General Settings
// ============================================
const updateGeneral = asyncHandler(async (req, res) => {
  const { restaurantName, phone, email, address, kraPin } = req.body;
  
  let settings = await RestoSettings.findOne({ tenantId: req.tenant._id });
  if (!settings) {
    settings = new RestoSettings({ tenantId: req.tenant._id });
  }

  if (restaurantName !== undefined) settings.general.restaurantName = restaurantName;
  if (phone !== undefined) settings.general.phone = phone;
  if (email !== undefined) settings.general.email = email;
  if (address !== undefined) settings.general.address = address;
  if (kraPin !== undefined) settings.general.kraPin = kraPin;
  
  settings.updatedBy = req.user.id;
  await settings.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.general_updated',
    module: 'resto'
  });

  sendSuccess(res, null, 'General settings updated');
});

// ============================================
// Update User Profile
// ============================================
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  
  let user = await RestoUser.findById(req.user.id);
  
  // If user doesn't exist in RestoUser, create one
  if (!user) {
    const Tenant = require('../../models/admin/Tenant');
    const tenant = await Tenant.findById(req.tenant._id).lean();
    
    user = new RestoUser({
      _id: req.user.id,
      tenantId: req.tenant._id,
      name: name || tenant?.owner?.name || '',
      email: email || tenant?.contact?.email || '',
      phone: phone || tenant?.contact?.phone || '',
      role: 'owner',
      isActive: true,
    });
    await user.save();
  } else {
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    await user.save();
  }

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.profile_updated',
    module: 'resto'
  });

  sendSuccess(res, {
    name: user.name,
    email: user.email,
    phone: user.phone
  }, 'Profile updated');
});

// ============================================
// Update Password
// ============================================
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password required');
  }
  
  const user = await RestoUser.findById(req.user.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect');
  
  user.password = newPassword;
  await user.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.password_changed',
    module: 'resto'
  });

  sendSuccess(res, null, 'Password changed');
});

// ============================================
// Update Preferences
// ============================================
const updatePreferences = asyncHandler(async (req, res) => {
  const { currency, dateFormat, timezone, vatRate, serviceCharge, receiptFooter } = req.body;
  
  let settings = await RestoSettings.findOne({ tenantId: req.tenant._id });
  if (!settings) {
    settings = new RestoSettings({ tenantId: req.tenant._id });
  }

  if (currency !== undefined) settings.preferences.currency = currency;
  if (dateFormat !== undefined) settings.preferences.dateFormat = dateFormat;
  if (timezone !== undefined) settings.preferences.timezone = timezone;
  if (vatRate !== undefined) settings.preferences.vatRate = vatRate;
  if (serviceCharge !== undefined) settings.preferences.serviceCharge = serviceCharge;
  if (receiptFooter !== undefined) settings.preferences.receiptFooter = receiptFooter;
  
  settings.updatedBy = req.user.id;
  await settings.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.preferences_updated',
    module: 'resto'
  });

  sendSuccess(res, null, 'Preferences updated');
});

// ============================================
// Update Notification Settings
// ============================================
const updateNotifications = asyncHandler(async (req, res) => {
  let settings = await RestoSettings.findOne({ tenantId: req.tenant._id });
  if (!settings) {
    settings = new RestoSettings({ tenantId: req.tenant._id });
  }

  settings.notifications = {
    ...settings.notifications,
    ...req.body
  };
  
  settings.updatedBy = req.user.id;
  await settings.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.notifications_updated',
    module: 'resto'
  });

  sendSuccess(res, null, 'Notification settings updated');
});

// ============================================
// Update Opening Hours
// ============================================
const updateOpeningHours = asyncHandler(async (req, res) => {
  const { weekdays, weekends } = req.body;
  
  let settings = await RestoSettings.findOne({ tenantId: req.tenant._id });
  if (!settings) {
    settings = new RestoSettings({ tenantId: req.tenant._id });
  }

  if (weekdays !== undefined) settings.openingHours.weekdays = weekdays;
  if (weekends !== undefined) settings.openingHours.weekends = weekends;
  
  settings.updatedBy = req.user.id;
  await settings.save();

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.opening_hours_updated',
    module: 'resto'
  });

  sendSuccess(res, null, 'Opening hours updated');
});

// ============================================
// Reset Settings to Default
// ============================================
const resetSettings = asyncHandler(async (req, res) => {
  const settings = await RestoSettings.findOneAndUpdate(
    { tenantId: req.tenant._id },
    {
      general: {
        restaurantName: null,
        phone: null,
        email: null,
        address: null,
        kraPin: null,
      },
      preferences: {
        currency: 'KES',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Africa/Nairobi',
        vatRate: 16,
        serviceCharge: 0,
        receiptFooter: null,
      },
      notifications: {
        orderEmail: true,
        orderSms: true,
        lowStockEmail: true,
        lowStockSms: false,
        reservationEmail: true,
        reservationSms: true,
      },
      openingHours: {
        weekdays: '8:00 AM - 10:00 PM',
        weekends: '9:00 AM - 11:00 PM',
      },
      updatedBy: req.user.id,
    },
    { new: true, upsert: true }
  );

  await AuditLog.create({
    tenantId: req.tenant._id,
    userId: req.user.id,
    userModel: 'RestoUser',
    action: 'settings.reset',
    module: 'resto'
  });

  sendSuccess(res, settings, 'Settings reset to default');
});

module.exports = {
  getSettings,
  updateGeneral,
  updateProfile,
  updatePassword,
  updatePreferences,
  updateNotifications,
  updateOpeningHours,
  resetSettings
};