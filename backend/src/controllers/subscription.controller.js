const User = require('../models/User');

// @desc    Create Checkout Session (Mocked)
// @route   POST /api/subscription/checkout
exports.createCheckout = async (req, res, next) => {
    try {
        const { planId } = req.body;
        const userId = req.user._id;

        // Mock Tier Mapping
        const tierMap = {
            'pro_monthly': 'pro',
            'premium_monthly': 'premium'
        };

        const newTier = tierMap[planId] || 'pro';

        // In Demo mode, we just update the user directly
        await User.findByIdAndUpdate(userId, {
            'subscription.tier': newTier,
            'subscription.currentPeriodEnd': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

        res.json({ success: true, message: `Successfully upgraded to ${newTier} tier (Demo Mode)` });
    } catch (error) {
        next(error);
    }
};

// @desc    Stripe Webhook (Disabled)
// @route   POST /api/subscription/webhook
exports.webhook = async (req, res, next) => {
    res.status(200).json({ message: 'Webhook disabled' });
};
