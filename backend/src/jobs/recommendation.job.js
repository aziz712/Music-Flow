const cron = require('node-cron');
const User = require('../models/User');
const Song = require('../models/Song');
const SongInteraction = require('../models/SongInteraction');

/**
 * Recommendation Maintenance Job
 * Runs every 6 hours
 */
cron.schedule('0 */6 * * *', async () => {
    

    try {
        // 1. Update Global Popularity Scores
        // ---------------------------------
        const popularityStats = await SongInteraction.aggregate([
            { $match: { action: { $in: ['play', 'like'] } } },
            { $group: { _id: '$songId', count: { $sum: 1 } } }
        ]);

        for (const stat of popularityStats) {
            await Song.findOneAndUpdate(
                { songId: stat._id },
                { popularityScore: stat.count },
                { upsert: false }
            );
        }

        // 2. Simple User Clustering (K-Means Placeholder)
        // ----------------------------------------------
        // In a real production app, we would use a library like 'ml-kmeans'
        // For this architecture, we'll assign users to clusters based on their top genre
        const users = await User.find({ isDeleted: false });

        for (const user of users) {
            const history = await SongInteraction.find({ userId: user._id }).limit(20).lean();
            if (history.length > 0) {
                // Determine dominant genre from history
                const genres = history.map(h => h.metadata?.genre).filter(Boolean);
                if (genres.length > 0) {
                    const topGenre = genres.sort((a, b) =>
                        genres.filter(v => v === a).length - genres.filter(v => v === b).length
                    ).pop();

                    user.clusterId = `cluster_${topGenre.toLowerCase().replace(/\s+/g, '_')}`;
                    await user.save();
                }
            }
        }

        
    } catch (error) {
        console.error('Recommendation Job Error:', error);
    }
});
