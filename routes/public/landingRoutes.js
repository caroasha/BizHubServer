const router = require('express').Router();
const { getLandingContent, submitContact, requestDemo, aiChat } = require('../../controllers/public/landingController');

router.get('/', getLandingContent);
router.post('/contact', submitContact);
router.post('/demo', requestDemo);
router.post('/ai-chat', aiChat);

module.exports = router;