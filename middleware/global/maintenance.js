const Settings = require('../../models/admin/Settings');
const logger = require('../../utils/logger');

const getFlags = async () => {
  try {
    const flags = await Settings.find({ category: 'features' }).lean();
    const map = {};
    flags.forEach((f) => { map[f.key] = f.value; });
    return map;
  } catch (err) {
    logger.error('Failed to read maintenance flags:', err.message);
    return {};
  }
};

const maintenance = async (req, res, next) => {
  try {
    const flags = await getFlags();
    const path = req.path;

    const isAdmin = path.startsWith('/admin') || path.startsWith('/api/v1/admin');
    const isHealth = path === '/health' || path === '/api' || path === '/';

    if (isHealth || isAdmin) return next();

    // Platform maintenance
    if (flags.maintenance_platform === 'true') {
      return res.status(503).json({ success: false, message: 'Under maintenance', error: 'MAINTENANCE' });
    }

    // Landing maintenance - only public routes
    const publicPaths = ['/public', '/api/v1/public', '/api/v1/auth'];
    const isPublic = publicPaths.some(p => path.startsWith(p)) || path === '/' || !path.startsWith('/api/v1/');
    if (isPublic && flags.maintenance_landing === 'true') {
      return res.status(503).json({ success: false, message: 'Website under maintenance', error: 'MAINTENANCE_LANDING' });
    }

    // Module maintenance - only module API routes
    const moduleMap = {
      'resto': 'maintenance_resto',
      'pharma': 'maintenance_pharma',
      'apartment': 'maintenance_apartment',
      'electro': 'maintenance_electro',
      'cyber': 'maintenance_cyber',
    };

    for (const [mod, flagKey] of Object.entries(moduleMap)) {
      if (path.includes(`/api/v1/${mod}`) && flags[flagKey] === 'true') {
        return res.status(503).json({ success: false, message: 'Module under maintenance', error: 'MAINTENANCE_MODULE' });
      }
    }

    next();
  } catch (err) {
    logger.error('Maintenance middleware error:', err.message);
    next();
  }
};

module.exports = maintenance;