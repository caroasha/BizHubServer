const router = require('express').Router();
const ctrl = require('../../controllers/pharma/prescriptionController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/status', ctrl.updateStatus);

module.exports = router;