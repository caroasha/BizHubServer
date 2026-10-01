const router = require('express').Router();
const { getAllAdmin, getBySection, update } = require('../../controllers/admin/landingController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAllAdmin);
router.get('/:section', getBySection);
router.put('/:section', update);

module.exports = router;