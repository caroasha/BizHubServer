const router = require('express').Router();
const ctrl = require('../../controllers/cyber/sessionController');
const auth = require('../../middleware/cyber/auth');
const sub = require('../../middleware/cyber/subscriptionCheck');
router.use(auth, sub);
router.get('/', ctrl.getAll);
router.post('/start', ctrl.start);
router.put('/:id/end', ctrl.end);
module.exports = router;