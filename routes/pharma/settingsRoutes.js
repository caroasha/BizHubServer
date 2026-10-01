const router = require('express').Router();
const ctrl = require('../../controllers/pharma/settingsController');
const auth = require('../../middleware/pharma/auth');
const subscriptionCheck = require('../../middleware/pharma/subscriptionCheck');

router.use(auth, subscriptionCheck);
router.get('/', ctrl.getSettings);
router.put('/general', ctrl.updateGeneral);
router.put('/profile', ctrl.updateProfile);
router.put('/password', ctrl.updatePassword);
router.put('/preferences', ctrl.updatePreferences);

module.exports = router;