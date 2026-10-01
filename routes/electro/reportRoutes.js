const router = require('express').Router();
const ctrl = require('../../controllers/electro/reportController');
const auth = require('../../middleware/electro/auth');
const sub = require('../../middleware/electro/subscriptionCheck');
router.use(auth, sub);
router.get('/dashboard', ctrl.getDashboard);
module.exports = router;