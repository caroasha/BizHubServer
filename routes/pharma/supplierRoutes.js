const router = require('express').Router();
const ctrl = require('../../controllers/pharma/supplierController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;