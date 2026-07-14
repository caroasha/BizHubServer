const router = require('express').Router();
const env = require('../config/env');

router.use('/admin', require('./admin/index'));
router.use('/public', require('./public/index'));
router.use('/pharma', require('./pharma/index'));
router.use('/apartment', require('./apartment/index'));
router.use('/electro', require('./electro/index'));
router.use('/cyber', require('./cyber/index'));
router.use('/resto', require('./resto/index'));

module.exports = router;