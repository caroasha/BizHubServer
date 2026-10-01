const router = require('express').Router();
const ctrl = require('../../controllers/apartment/maintenanceController');
const auth = require('../../middleware/apartment/auth');
const sub = require('../../middleware/apartment/subscriptionCheck');
router.use(auth, sub);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
module.exports = router;