const router = require('express').Router();
const { mpesaCallback } = require('../../controllers/public/webhookController');

router.post('/mpesa', mpesaCallback);

module.exports = router;