const router = require('express').Router();
const { register, checkAvailability } = require('../../controllers/public/registrationController');
const { authLimiter } = require('../../middleware/global/rateLimiter');

router.post('/', authLimiter, register);
router.get('/check', checkAvailability);

module.exports = router;