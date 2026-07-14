const router = require('express').Router();
const { getPublicSettings, getPublicPlans, getPublicModules, getPublicFaqs, getPublicTestimonials } = require('../../controllers/public/siteSettingsController');

router.get('/', getPublicSettings);
router.get('/plans', getPublicPlans);
router.get('/modules', getPublicModules);
router.get('/faqs', getPublicFaqs);
router.get('/testimonials', getPublicTestimonials);

module.exports = router;