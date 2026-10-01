const router = require('express').Router();
const ctrl = require('../../controllers/public/registrationController');
const { authLimiter } = require('../../middleware/global/rateLimiter');

router.post('/', authLimiter, ctrl.register);
router.get('/check', ctrl.checkAvailability);

module.exports = router;