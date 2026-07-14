const multer = require('multer');
const path = require('path');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');

// ============================================
// File Upload Middleware
// ============================================

const ALLOWED_TYPES = env.ALLOWED_FILE_TYPES || ['jpg', 'jpeg', 'png', 'pdf', 'csv', 'xlsx'];
const MAX_SIZE = (env.UPLOAD_MAX_SIZE_MB || 10) * 1024 * 1024; // MB to bytes

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (ALLOWED_TYPES.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type .${ext} not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
  },
});

module.exports = upload;