const router = require('express').Router();
const { getAll, getBySlug, compare } = require('../../controllers/public/plansController');

router.get('/', getAll);
router.get('/compare', compare);
router.get('/:slug', getBySlug);

module.exports = router;