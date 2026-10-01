const router = require('express').Router();
const settingsController = require('../../controllers/resto/settingsController');
const auth = require('../../middleware/resto/auth');
const subscriptionCheck = require('../../middleware/resto/subscriptionCheck');

// All routes require auth and subscription
router.use(auth);
router.use(subscriptionCheck);

// Get all settings (including profile)
router.get('/', settingsController.getSettings);

// Update general settings
router.put('/general', settingsController.updateGeneral);

// Update user profile
router.put('/profile', settingsController.updateProfile);

// Update password
router.put('/password', settingsController.updatePassword);

// Update preferences
router.put('/preferences', settingsController.updatePreferences);

// Update notification settings
router.put('/notifications', settingsController.updateNotifications);

// Update opening hours
router.put('/opening-hours', settingsController.updateOpeningHours);

// Reset settings to default
router.post('/reset', settingsController.resetSettings);

module.exports = router;