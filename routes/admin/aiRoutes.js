const router = require('express').Router();
const { getLandingAi, getClientAi, updateLandingAi, updateClientAi, getChatHistory, clearChatHistory } = require('../../controllers/admin/aiController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/landing', getLandingAi);
router.get('/client', getClientAi);
router.put('/landing', updateLandingAi);
router.put('/client', updateClientAi);
router.get('/history', getChatHistory);
router.delete('/history', clearChatHistory);

module.exports = router;