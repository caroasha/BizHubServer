const router = require('express').Router();
const ctrl = require('../../controllers/public/downloadController');
const { generalLimiter } = require('../../middleware/global/rateLimiter');

router.get('/', generalLimiter, ctrl.list);
router.get('/:id/download', generalLimiter, ctrl.trackAndRedirect);

module.exports = router;