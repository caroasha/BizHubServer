const router = require('express').Router();
const { getDashboard, getRevenueChart, getTenantGrowth } = require('../../controllers/admin/analyticsController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/dashboard', getDashboard);
router.get('/revenue', getRevenueChart);
router.get('/growth', getTenantGrowth);

module.exports = router;