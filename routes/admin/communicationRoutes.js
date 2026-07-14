const router = require('express').Router();
const { sendToUser, sendToAllUsers, sendToModuleUsers, sendToModuleSpecificUsers, sendCustomEmail, getTenantUsers } = require('../../controllers/admin/communicationController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.post('/user', sendToUser);
router.post('/all', sendToAllUsers);
router.post('/module', sendToModuleUsers);
router.post('/module-specific', sendToModuleSpecificUsers);
router.post('/custom', sendCustomEmail);
router.get('/tenants/:tenantId/users', getTenantUsers);

module.exports = router;