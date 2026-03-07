const cron = require('node-cron');
const User = require('../models/User');

/**
 * Cleanup Job: Runs daily at midnight
 */
cron.schedule('0 0 * * *', async () => {
    

    try {
        const now = new Date();
        const usersToDelete = await User.find({
            isDeleted: true,
            deletionGracePeriodEnd: { $lte: now }
        });

        for (const user of usersToDelete) {
            

            // 1. Revoke Sessions
            user.activeSessions = [];
            await user.save();

            // 2. Final Hard Delete
            // For now, we'll just keep it marked as deleted but cleared of PII if needed
            // User.deleteOne({ _id: user._id }) works too
            await User.deleteOne({ _id: user._id });
        }
    } catch (error) {
        console.error('Cleanup Job Error:', error);
    }
});
