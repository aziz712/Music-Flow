const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get User Notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;

        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Notification.countDocuments({ userId: req.user._id });

        res.json({
            notifications,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark as Read
// @route   PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Preferences
// @route   PUT /api/notifications/preferences
exports.updatePreferences = async (req, res, next) => {
    try {
        const { email, productUpdates, weeklyDigest } = req.body;
        const user = await User.findById(req.user._id);

        user.notificationPreferences = {
            ...user.notificationPreferences,
            email: email !== undefined ? email : user.notificationPreferences.email,
            productUpdates: productUpdates !== undefined ? productUpdates : user.notificationPreferences.productUpdates,
            weeklyDigest: weeklyDigest !== undefined ? weeklyDigest : user.notificationPreferences.weeklyDigest,
            securityAlerts: true // Force true
        };

        await user.save();
        res.json({ success: true, preferences: user.notificationPreferences });
    } catch (error) {
        next(error);
    }
};
