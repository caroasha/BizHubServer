const router = require('express').Router();
const ctrl = require('../../controllers/public/webhookController');

router.post('/mpesa', ctrl.mpesaCallback);
router.post('/mpesa/timeout', ctrl.mpesaTimeout);

module.exports = router;