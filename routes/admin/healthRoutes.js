const router = require('express').Router();
const { getHealth } = require('../../controllers/admin/healthController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getHealth);

module.exports = router;