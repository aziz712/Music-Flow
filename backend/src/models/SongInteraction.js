const mongoose = require('mongoose');

const SongInteractionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: String, required: true },
    action: {
        type: String,
        enum: ['play', 'like', 'skip', 'download'],
        required: true
    },
    durationPlayed: { type: Number, default: 0 },
    metadata: {
        title: String,
        artist: String,
        genre: String,
        tags: [String]
    },
    timestamp: { type: Date, default: Date.now }
});

// Indexes for high-performance recommendation queries
SongInteractionSchema.index({ userId: 1, action: 1 });
SongInteractionSchema.index({ songId: 1, action: 1 });
SongInteractionSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SongInteraction', SongInteractionSchema);
