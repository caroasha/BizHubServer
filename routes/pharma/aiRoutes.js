const router = require('express').Router();
const ctrl = require('../../controllers/pharma/aiController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.post('/chat', ctrl.chat);

module.exports = router;