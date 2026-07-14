const Backup = require('../../models/admin/Backup');
const Settings = require('../../models/admin/Settings');
const AuditLog = require('../../models/admin/AuditLog');
const backupService = require('../../services/backupService');
const emailService = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const ApiError = require('../../utils/ApiError');
const upload = require('../../middleware/global/upload');
const path = require('path');
const fs = require('fs');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [backups, total] = await Promise.all([
    Backup.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Backup.countDocuments(),
  ]);

  sendPaginated(res, backups, {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  });
});

const getSettings = asyncHandler(async (req, res) => {
  const [autoBackup, frequency, autoEmail] = await Promise.all([
    Settings.findOne({ key: 'backup_auto' }),
    Settings.findOne({ key: 'backup_frequency' }),
    Settings.findOne({ key: 'backup_auto_email' }),
  ]);

  sendSuccess(res, {
    autoBackup: autoBackup?.value || 'false',
    frequency: frequency?.value || 'daily',
    autoEmail: autoEmail?.value || 'false',
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { autoBackup, frequency, autoEmail } = req.body;

  const updates = [];
  if (autoBackup !== undefined) {
    updates.push(
      Settings.findOneAndUpdate({ key: 'backup_auto' }, { value: autoBackup, category: 'backup' }, { upsert: true, new: true })
    );
  }
  if (frequency) {
    updates.push(
      Settings.findOneAndUpdate({ key: 'backup_frequency' }, { value: frequency, category: 'backup' }, { upsert: true, new: true })
    );
  }
  if (autoEmail !== undefined) {
    updates.push(
      Settings.findOneAndUpdate({ key: 'backup_auto_email' }, { value: autoEmail, category: 'backup' }, { upsert: true, new: true })
    );
  }

  await Promise.all(updates);

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'backup.settings_updated',
    module: 'admin',
    details: { autoBackup, frequency, autoEmail },
  });

  sendSuccess(res, { autoBackup, frequency, autoEmail }, 'Settings updated');
});

const createNow = asyncHandler(async (req, res) => {
  const { tenantId, module } = req.body;
  const type = tenantId ? 'tenant' : 'full';

  const result = await backupService.createBackup(tenantId || null, module || null);

  if (!result.success) throw new ApiError(500, result.error || 'Backup failed', 'BACKUP_FAILED');

  const backup = await Backup.create({
    tenantId: tenantId || null,
    filename: result.filename,
    filepath: result.filepath,
    size: result.size,
    type,
    module: module || null,
    status: 'completed',
    createdBy: req.admin._id,
  });

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'backup.created',
    module: 'admin',
    resource: 'Backup',
    resourceId: backup._id,
    details: { type, tenantId },
  });

  const autoEmail = await Settings.findOne({ key: 'backup_auto_email' });
  if (autoEmail?.value === 'true' && req.admin.email) {
    await emailService.send({
      to: req.admin.email,
      subject: `Backup Created - ${result.filename}`,
      html: `<h1>Backup Created</h1><p><strong>File:</strong> ${result.filename}</p><p><strong>Size:</strong> ${result.sizeFormatted}</p><p><strong>Collections:</strong> ${result.collections}</p><p><strong>Documents:</strong> ${result.documents}</p>`,
    });
  }

  sendSuccess(res, {
    backup: {
      id: backup._id,
      filename: result.filename,
      size: result.sizeFormatted,
      collections: result.collections,
      documents: result.documents,
      type,
      createdAt: backup.createdAt,
    },
  }, 'Backup created', 201);
});

const uploadBackup = asyncHandler(async (req, res) => {
  const uploadMiddleware = upload.single('backup');
  
  uploadMiddleware(req, res, async (err) => {
    if (err) throw new ApiError(400, err.message, 'UPLOAD_ERROR');
    if (!req.file) throw new ApiError(400, 'Backup file required');

    const result = await backupService.restoreFromUpload(req.file.path);

    fs.unlinkSync(req.file.path);

    if (!result.success) throw new ApiError(400, result.error || 'Restore failed', 'RESTORE_FAILED');

    await AuditLog.create({
      userId: req.admin._id,
      userModel: 'Admin',
      action: 'backup.uploaded_restore',
      module: 'admin',
      details: { filename: req.file.originalname, ...result },
    });

    sendSuccess(res, result, 'Backup restored from upload');
  });
});

const restore = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new ApiError(404, 'Backup not found', 'BACKUP_NOT_FOUND');

  const result = await backupService.restoreBackup(backup.filename);
  if (!result.success) throw new ApiError(500, result.error || 'Restore failed', 'RESTORE_FAILED');

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'backup.restored',
    module: 'admin',
    resource: 'Backup',
    resourceId: backup._id,
    details: result,
  });

  sendSuccess(res, result, 'Restore completed');
});

const download = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new ApiError(404, 'Backup not found', 'BACKUP_NOT_FOUND');

  const filepath = backupService.getBackupFilePath(backup.filename);
  if (!filepath) throw new ApiError(404, 'Backup file not found on disk', 'FILE_NOT_FOUND');

  res.download(filepath, backup.filename);
});

const sendToEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');

  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new ApiError(404, 'Backup not found', 'BACKUP_NOT_FOUND');

  const filepath = backupService.getBackupFilePath(backup.filename);
  if (!filepath) throw new ApiError(404, 'Backup file not found on disk', 'FILE_NOT_FOUND');

  await emailService.send({
    to: email,
    subject: `Backup - ${backup.filename}`,
    html: `<h1>Backup File</h1><p><strong>File:</strong> ${backup.filename}</p><p><strong>Size:</strong> ${(backup.size / 1024).toFixed(2)} KB</p><p><strong>Created:</strong> ${backup.createdAt}</p><p>Download the attached file to restore.</p>`,
  });

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'backup.emailed',
    module: 'admin',
    resource: 'Backup',
    resourceId: backup._id,
    details: { email },
  });

  sendSuccess(res, null, `Backup sent to ${email}`);
});

const remove = asyncHandler(async (req, res) => {
  const backup = await Backup.findById(req.params.id);
  if (!backup) throw new ApiError(404, 'Backup not found', 'BACKUP_NOT_FOUND');

  backupService.deleteBackup(backup.filename);
  await backup.deleteOne();

  await AuditLog.create({
    userId: req.admin._id,
    userModel: 'Admin',
    action: 'backup.deleted',
    module: 'admin',
    resource: 'Backup',
    resourceId: backup._id,
    details: { filename: backup.filename },
  });

  sendSuccess(res, null, 'Backup deleted');
});

module.exports = { getAll, getSettings, updateSettings, createNow, uploadBackup, restore, download, sendToEmail, remove };