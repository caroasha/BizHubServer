const router = require('express').Router();
const { getAll, getByType, accept, checkAcceptance } = require('../../controllers/public/legalController');

router.get('/', getAll);
router.get('/check', checkAcceptance);
router.get('/:type', getByType);
router.post('/:type/accept', accept);

module.exports = router;