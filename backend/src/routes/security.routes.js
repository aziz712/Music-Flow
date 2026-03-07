const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/change-password', securityController.changePassword);
router.post('/2fa/setup', securityController.setup2FA);
router.post('/2fa/verify', securityController.verify2FA);
router.get('/sessions', securityController.getSessions);
router.delete('/sessions/:id', securityController.logoutSession);

module.exports = router;
