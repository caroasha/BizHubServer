const router = require('express').Router();
const ctrl = require('../../controllers/pharma/purchaseController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.post('/:id/send', ctrl.sendToSupplier);
router.post('/:id/receive', ctrl.receive);

module.exports = router;