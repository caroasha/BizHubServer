const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');

const BACKUP_DIR = path.resolve(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const getCollections = async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections.map((c) => c.name);
};

const createBackup = async (tenantId = null, module = null) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = tenantId
      ? `bizhub-tenant-${tenantId}-${timestamp}.json`
      : `bizhub-full-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    const collections = await getCollections();
    const backup = {
      metadata: {
        version: env.APP_VERSION,
        type: tenantId ? 'tenant' : 'full',
        tenantId: tenantId || null,
        module: module || null,
        createdAt: new Date().toISOString(),
        collections: [],
      },
      data: {},
    };

    for (const colName of collections) {
      const filter = tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {};
      const docs = await mongoose.connection.db.collection(colName).find(filter).toArray();

      if (docs.length > 0) {
        backup.data[colName] = docs;
        backup.metadata.collections.push({ name: colName, count: docs.length });
      }
    }

    const jsonStr = JSON.stringify(backup, null, 2);
    fs.writeFileSync(filepath, jsonStr);

    const stats = fs.statSync(filepath);
    logger.info(`Backup created: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

    return {
      success: true,
      filename,
      filepath,
      size: stats.size,
      sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
      collections: backup.metadata.collections.length,
      documents: backup.metadata.collections.reduce((sum, c) => sum + c.count, 0),
    };
  } catch (error) {
    logger.error('Backup error:', error);
    return { success: false, error: error.message };
  }
};

const restoreBackup = async (filename) => {
  try {
    const filepath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return { success: false, error: 'Backup file not found' };
    }

    const raw = fs.readFileSync(filepath, 'utf-8');
    const backup = JSON.parse(raw);

    if (!backup.data || !backup.metadata) {
      return { success: false, error: 'Invalid backup format' };
    }

    let restoredCollections = 0;
    let restoredDocuments = 0;

    for (const [colName, docs] of Object.entries(backup.data)) {
      if (docs.length > 0) {
        await mongoose.connection.db.collection(colName).deleteMany({});
        await mongoose.connection.db.collection(colName).insertMany(docs);
        restoredCollections++;
        restoredDocuments += docs.length;
      }
    }

    logger.info(`Restored from: ${filename} (${restoredCollections} collections, ${restoredDocuments} documents)`);

    return {
      success: true,
      filename,
      collections: restoredCollections,
      documents: restoredDocuments,
      metadata: backup.metadata,
    };
  } catch (error) {
    logger.error('Restore error:', error);
    return { success: false, error: error.message };
  }
};

const restoreFromUpload = async (filepath) => {
  try {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const backup = JSON.parse(raw);

    if (!backup.data || !backup.metadata) {
      return { success: false, error: 'Invalid backup format' };
    }

    let restoredCollections = 0;
    let restoredDocuments = 0;

    for (const [colName, docs] of Object.entries(backup.data)) {
      if (docs.length > 0) {
        await mongoose.connection.db.collection(colName).deleteMany({});
        await mongoose.connection.db.collection(colName).insertMany(docs);
        restoredCollections++;
        restoredDocuments += docs.length;
      }
    }

    logger.info(`Restored from upload (${restoredCollections} collections, ${restoredDocuments} documents)`);

    return {
      success: true,
      collections: restoredCollections,
      documents: restoredDocuments,
      metadata: backup.metadata,
    };
  } catch (error) {
    logger.error('Restore from upload error:', error);
    return { success: false, error: error.message };
  }
};

const listBackups = () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const filepath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filepath);
        return {
          filename: f,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
          createdAt: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { success: true, backups, total: backups.length };
  } catch (error) {
    logger.error('List backups error:', error);
    return { success: false, error: error.message, backups: [] };
  }
};

const getBackupFilePath = (filename) => {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return filepath;
};

const deleteBackup = (filename) => {
  try {
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return { success: false, error: 'Backup file not found' };
    }
    fs.unlinkSync(filepath);
    logger.info(`Backup deleted: ${filename}`);
    return { success: true };
  } catch (error) {
    logger.error('Delete backup error:', error);
    return { success: false, error: error.message };
  }
};

const deleteOldBackups = (days = 30) => {
  try {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(BACKUP_DIR);
    let deleted = 0;

    files.forEach((file) => {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filepath);
      if (stats.birthtimeMs < cutoff) {
        fs.unlinkSync(filepath);
        deleted++;
      }
    });

    logger.info(`Cleaned up ${deleted} old backups`);
    return { success: true, deleted };
  } catch (error) {
    logger.error('Cleanup backups error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createBackup,
  restoreBackup,
  restoreFromUpload,
  listBackups,
  getBackupFilePath,
  deleteBackup,
  deleteOldBackups,
};