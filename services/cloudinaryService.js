const env = require('../config/env');
const { getCloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const getStorageProvider = async () => {
  try {
    const Settings = require('../models/admin/Settings');
    const setting = await Settings.findOne({ key: 'storage_provider', category: 'features' });
    return setting?.value || env.STORAGE_PROVIDER || 'local';
  } catch {
    return env.STORAGE_PROVIDER || 'local';
  }
};

const uploadFile = async (file, folder = 'bizhub') => {
  if (!file) return { success: false, error: 'No file provided' };

  try {
    const provider = await getStorageProvider();
    const cloudinary = provider === 'cloudinary' ? getCloudinary() : null;

    if (provider === 'cloudinary' && cloudinary) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'auto',
      });

      fs.unlinkSync(file.path);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
      };
    }

    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, filepath);

    return {
      success: true,
      url: `/uploads/${filename}`,
      publicId: filename,
      size: file.size,
    };
  } catch (error) {
    logger.error('File upload error:', error);
    return { success: false, error: error.message };
  }
};

const uploadMultiple = async (files, folder = 'bizhub') => {
  if (!files || files.length === 0) return { success: false, error: 'No files provided' };
  const results = await Promise.allSettled(files.map((file) => uploadFile(file, folder)));
  const uploaded = results.filter((r) => r.status === 'fulfilled' && r.value.success).map((r) => r.value);
  const failed = results.filter((r) => r.status === 'rejected' || !r.value.success).length;
  return { success: failed === 0, uploaded, failed, total: files.length };
};

const deleteFile = async (publicId) => {
  try {
    const provider = await getStorageProvider();
    const cloudinary = provider === 'cloudinary' ? getCloudinary() : null;

    if (provider === 'cloudinary' && cloudinary) {
      await cloudinary.uploader.destroy(publicId);
      return { success: true };
    }

    const filepath = path.resolve(__dirname, '../uploads', publicId);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    return { success: true };
  } catch (error) {
    logger.error('File delete error:', error);
    return { success: false, error: error.message };
  }
};

const getUrl = async (publicId, options = {}) => {
  const provider = await getStorageProvider();
  const cloudinary = provider === 'cloudinary' ? getCloudinary() : null;

  if (provider !== 'cloudinary' || !cloudinary) return `/uploads/${publicId}`;

  return cloudinary.url(publicId, {
    width: options.width,
    height: options.height,
    crop: options.crop || 'fill',
    quality: options.quality || 'auto',
    format: options.format,
  });
};

module.exports = { uploadFile, uploadMultiple, deleteFile, getUrl };