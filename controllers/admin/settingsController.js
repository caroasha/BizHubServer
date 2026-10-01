const Settings = require('../../models/admin/Settings');
const AuditLog = require('../../models/admin/AuditLog');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');

const getAll = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const settings = await Settings.find(filter).sort({ category: 1, key: 1 }).lean();
  sendSuccess(res, settings);
});

const getByKey = asyncHandler(async (req, res) => {
  const setting = await Settings.findOne({ key: req.params.key }).lean();
  if (!setting) throw new ApiError(404, 'Setting not found', 'SETTING_NOT_FOUND');
  sendSuccess(res, setting);
});

const update = asyncHandler(async (req, res) => {
  const { key, value, description, category, isPublic } = req.body;
  if (!key || value === undefined) throw new ApiError(400, 'Key and value required');

  const updateData = { value, description, category };
  if (isPublic !== undefined) updateData.isPublic = isPublic;

  const setting = await Settings.findOneAndUpdate(
    { key },
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'setting.updated',
    module: 'admin',
    resource: 'Settings',
    resourceId: setting._id,
    details: { key, value },
  });

  sendSuccess(res, setting, 'Setting updated');
});

const bulkUpdate = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || !Array.isArray(settings)) throw new ApiError(400, 'Settings array required');

  const results = [];
  for (const item of settings) {
    const updateData = { value: item.value };
    if (item.description) updateData.description = item.description;
    if (item.category) updateData.category = item.category;
    if (item.isPublic !== undefined) updateData.isPublic = item.isPublic;

    const setting = await Settings.findOneAndUpdate(
      { key: item.key },
      { $set: updateData },
      { new: true, upsert: true }
    );
    results.push(setting);
  }

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'settings.bulk_updated',
    module: 'admin',
    resource: 'Settings',
    details: { count: settings.length },
  });

  sendSuccess(res, results, `${results.length} settings updated`);
});
const remove = asyncHandler(async (req, res) => {
  const setting = await Settings.findOneAndDelete({ key: req.params.key });
  if (!setting) throw new ApiError(404, 'Setting not found', 'SETTING_NOT_FOUND');

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'setting.deleted',
    module: 'admin',
    resource: 'Settings',
    resourceId: setting._id,
    details: { key: req.params.key },
  });

  sendSuccess(res, null, 'Setting deleted');
});

const getFeatureFlags = asyncHandler(async (req, res) => {
  const flags = await Settings.find({ category: 'features' }).lean();
  const flagMap = {};
  flags.forEach((f) => { flagMap[f.key] = f.value; });
  sendSuccess(res, flagMap);
});

module.exports = { getAll, getByKey, update, bulkUpdate, remove, getFeatureFlags };