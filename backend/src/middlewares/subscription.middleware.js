/**
 * Middleware to gate features based on subscription tier
 */
exports.gateFeature = (feature) => {
    return (req, res, next) => {
        const user = req.user;
        const tier = user.subscription?.tier || 'free';

        const limits = {
            'bulk_download': { 'free': 5, 'pro': 50, 'premium': 999 },
            'streaming_quality': { 'free': '128k', 'pro': '256k', 'premium': '320k' }
        };

        if (feature === 'bulk_download') {
            const count = req.body.songIds?.length || 0;
            if (count > limits[feature][tier]) {
                return res.status(403).json({
                    message: `Your ${tier} plan only allows up to ${limits[feature][tier]} songs per bulk download.`
                });
            }
        }

        next();
    };
};
