const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

const { protect } = require('../middlewares/auth.middleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile', protect, userController.getProfile);
router.put('/settings', protect, userController.updateSettings);
router.delete('/profile', protect, userController.deleteAccount);
router.post('/history', protect, userController.trackListeningHistory);
router.post('/favorites', protect, userController.toggleFavorite);
router.get('/favorites', protect, userController.getFavorites);

module.exports = router;
