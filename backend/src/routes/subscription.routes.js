const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { protect } = require('../middlewares/auth.middleware');

// Webhook must be raw body, handled in app.js if needed or here
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.webhook);

router.post('/checkout', protect, subscriptionController.createCheckout);

module.exports = router;
