const router = require('express').Router();
const ctrl = require('../../controllers/electro/warrantyController');
const auth = require('../../middleware/electro/auth');
const sub = require('../../middleware/electro/subscriptionCheck');
router.use(auth, sub);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
module.exports = router;