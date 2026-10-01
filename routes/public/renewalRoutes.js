const router = require('express').Router();
const ctrl = require('../../controllers/public/renewalController');

router.post('/', ctrl.renew);

module.exports = router;