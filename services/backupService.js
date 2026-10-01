'use strict';

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getCloudinary } = require('../config/cloudinary');

const BACKUP_FOLDER = 'bizhub-backups';

/* ============================================================
 * Collections excluded from backups.
 *
 * These are server-side artifacts, not business data.
 * Case-insensitive — matching happens against colName.toLowerCase().
 * ============================================================ */
const EXCLUDED_COLLECTIONS = new Set([
    // Mongo internals
    'system.indexes',
    'system.views',
    'system.profile',
    'system.users',

    // Logs — historical, not restorable state
    'logs',
    'requestlogs',
    'errorlogs',
    'syslogs',

    // Audit trail — comment out the next line if you WANT it backed up
    'auditlogs',

    // Transient / session state
    'sessions',
    'caches',
    'tmp',
    'temp',

    // Recursive — don't back up backups
    'backups',

    // Uploaded files should live on Cloudinary/S3, not in Mongo
    'uploads',
]);

const isExcluded = (name) =>
    EXCLUDED_COLLECTIONS.has(String(name).toLowerCase());

/* ============================================================
 * Cloudinary helpers
 * ============================================================ */

const requireCloudinary = () => {
    const c = getCloudinary();
    if (!c) {
        throw new Error('Cloudinary not configured (STORAGE_PROVIDER must be "cloudinary")');
    }
    return c;
};

const uploadToCloudinary = (buffer, filename) =>
    new Promise((resolve, reject) => {
        const c = requireCloudinary();
        const stream = c.uploader.upload_stream(
            {
                resource_type: 'raw',
                folder: BACKUP_FOLDER,
                public_id: filename,
                overwrite: true,
                use_filename: true,
                unique_filename: false,
            },
            (err, result) => {
                if (err) return reject(err);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    bytes: result.bytes,
                });
            }
        );
        stream.end(buffer);
    });

const fetchFromCloudinary = async (publicId) => {
    const c = requireCloudinary();
    const url = c.utils.url(publicId, {
        resource_type: 'raw',
        type: 'upload',
        secure: true,
    });
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Cloudinary fetch failed: ${res.status} ${res.statusText}`);
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
};

const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;
    try {
        const c = requireCloudinary();
        await c.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (err) {
        logger.warn('Cloudinary delete failed', { publicId, error: err.message });
    }
};

/* ============================================================
 * Data gathering
 * ============================================================ */

const getCollections = async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections.map((c) => c.name);
};

const gatherBackupData = async (tenantId = null, module = null) => {
    const collections = await getCollections();

    const backup = {
        metadata: {
            version: env.APP_VERSION,
            type: tenantId ? 'tenant' : 'full',
            tenantId: tenantId || null,
            module: module || null,
            createdAt: new Date().toISOString(),
            collections: [],
            excluded: [],
        },
        data: {},
    };

    const tenantFilter = tenantId
        ? { tenantId: new mongoose.Types.ObjectId(tenantId) }
        : {};

    for (const colName of collections) {
        if (isExcluded(colName)) {
            backup.metadata.excluded.push(colName);
            continue;
        }

        const docs = await mongoose.connection.db
            .collection(colName)
            .find(tenantFilter)
            .toArray();

        if (docs.length > 0) {
            backup.data[colName] = docs;
            backup.metadata.collections.push({ name: colName, count: docs.length });
        }
    }

    return backup;
};

/* ============================================================
 * Public API
 * ============================================================ */

const createBackup = async (tenantId = null, module = null) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = tenantId
            ? `bizhub-tenant-${tenantId}-${timestamp}.json`
            : `bizhub-full-${timestamp}.json`;

        const backup = await gatherBackupData(tenantId, module);
        const jsonStr = JSON.stringify(backup, null, 2);
        const buffer = Buffer.from(jsonStr, 'utf-8');
        const size = buffer.length;

        const uploaded = await uploadToCloudinary(buffer, filename);

        logger.info(
            `Backup uploaded: ${filename} (${(size / 1024).toFixed(2)} KB) → ${uploaded.url}`,
            {
                collections: backup.metadata.collections.length,
                excluded: backup.metadata.excluded.length,
            }
        );

        return {
            success: true,
            filename,
            url: uploaded.url,
            publicId: uploaded.publicId,
            size,
            sizeFormatted: `${(size / 1024).toFixed(2)} KB`,
            collections: backup.metadata.collections.length,
            documents: backup.metadata.collections.reduce((sum, c) => sum + c.count, 0),
            excluded: backup.metadata.excluded,
        };
    } catch (error) {
        logger.error('Backup error:', error);
        return { success: false, error: error.message };
    }
};

const restoreBackup = async (publicId) => {
    try {
        const buffer = await fetchFromCloudinary(publicId);
        const backup = JSON.parse(buffer.toString('utf-8'));

        if (!backup.data || !backup.metadata) {
            return { success: false, error: 'Invalid backup format' };
        }

        let restoredCollections = 0;
        let restoredDocuments = 0;

        for (const [colName, docs] of Object.entries(backup.data)) {
            if (isExcluded(colName)) continue; // safety — skip anything on the exclude list
            if (docs.length > 0) {
                await mongoose.connection.db.collection(colName).deleteMany({});
                await mongoose.connection.db.collection(colName).insertMany(docs);
                restoredCollections++;
                restoredDocuments += docs.length;
            }
        }

        logger.info(
            `Restored from Cloudinary: ${publicId} (${restoredCollections} collections, ${restoredDocuments} documents)`
        );

        return {
            success: true,
            collections: restoredCollections,
            documents: restoredDocuments,
            metadata: backup.metadata,
        };
    } catch (error) {
        logger.error('Restore error:', error);
        return { success: false, error: error.message };
    }
};

const restoreFromUpload = async (input) => {
    try {
        let raw;
        if (Buffer.isBuffer(input)) {
            raw = input.toString('utf-8');
        } else if (input && Buffer.isBuffer(input.buffer)) {
            raw = input.buffer.toString('utf-8');
        } else if (typeof input === 'string') {
            const fs = require('fs');
            raw = fs.readFileSync(input, 'utf-8');
        } else {
            return { success: false, error: 'Invalid upload input' };
        }

        const backup = JSON.parse(raw);
        if (!backup.data || !backup.metadata) {
            return { success: false, error: 'Invalid backup format' };
        }

        let restoredCollections = 0;
        let restoredDocuments = 0;

        for (const [colName, docs] of Object.entries(backup.data)) {
            if (isExcluded(colName)) continue;
            if (docs.length > 0) {
                await mongoose.connection.db.collection(colName).deleteMany({});
                await mongoose.connection.db.collection(colName).insertMany(docs);
                restoredCollections++;
                restoredDocuments += docs.length;
            }
        }

        logger.info(
            `Restored from upload (${restoredCollections} collections, ${restoredDocuments} documents)`
        );

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

const deleteBackup = async (publicIdOrFilename) => {
    try {
        if (!publicIdOrFilename) {
            return { success: false, error: 'publicId required' };
        }
        const publicId = publicIdOrFilename.startsWith(`${BACKUP_FOLDER}/`)
            ? publicIdOrFilename
            : `${BACKUP_FOLDER}/${publicIdOrFilename}`;

        await deleteFromCloudinary(publicId);
        logger.info(`Backup deleted from Cloudinary: ${publicId}`);
        return { success: true };
    } catch (error) {
        logger.error('Delete backup error:', error);
        return { success: false, error: error.message };
    }
};

const deleteOldBackups = async (days = 30) => {
    try {
        const Backup = require('../models/admin/Backup');
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const stale = await Backup.find({ createdAt: { $lt: cutoff } }).lean();

        let deleted = 0;
        for (const b of stale) {
            if (b.publicId) {
                await deleteFromCloudinary(b.publicId);
                await Backup.deleteOne({ _id: b._id });
                deleted++;
            }
        }

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
    deleteBackup,
    deleteOldBackups,
    uploadToCloudinary,
    deleteFromCloudinary,
    fetchFromCloudinary,
    EXCLUDED_COLLECTIONS,
};