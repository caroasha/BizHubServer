const router = require('express').Router();
const ctrl = require('../../controllers/apartment/reportController');
const auth = require('../../middleware/apartment/auth');
const sub = require('../../middleware/apartment/subscriptionCheck');
router.use(auth, sub);
router.get('/dashboard', ctrl.getDashboard);
module.exports = router;