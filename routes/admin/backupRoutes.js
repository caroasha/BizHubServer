const router = require('express').Router();
const { getAll, getSettings, updateSettings, createNow, uploadBackup, restore, download, sendToEmail, remove } = require('../../controllers/admin/backupController');
const superAdminAuth = require('../../middleware/admin/superAdminAuth');

router.use(superAdminAuth);

router.get('/', getAll);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/create', createNow);
router.post('/upload', uploadBackup);
router.put('/:id/restore', restore);
router.get('/:id/download', download);
router.post('/:id/email', sendToEmail);
router.delete('/:id', remove);

module.exports = router;