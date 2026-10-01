const router = require('express').Router();
const dashboardController = require('../../controllers/resto/dashboardController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

router.use(auth);
router.use(subscriptionCheck);

router.get('/stats', dashboardController.getStats);

module.exports = router;