const router = require('express').Router();
const ctrl = require('../../controllers/cyber/reportController');
const auth = require('../../middleware/cyber/auth');
const sub = require('../../middleware/cyber/subscriptionCheck');
router.use(auth, sub);
router.get('/dashboard', ctrl.getDashboard);
module.exports = router;