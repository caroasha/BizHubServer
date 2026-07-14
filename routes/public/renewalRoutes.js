const router = require('express').Router();
const { renew } = require('../../controllers/public/renewalController');

router.post('/', renew);

module.exports = router;