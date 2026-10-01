const router = require('express').Router();
const ctrl = require('../../controllers/pharma/reportController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.get('/dashboard', ctrl.getDashboard);
router.get('/sales', ctrl.getSalesReport);
router.get('/expiry', ctrl.getExpiryReport);
router.get('/inventory', ctrl.getInventoryReport);
router.get('/profit-loss', ctrl.getPLReport);

module.exports = router;