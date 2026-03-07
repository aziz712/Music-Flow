const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
    songId: { type: String, required: true, unique: true }, // Deezer or YouTube ID
    title: { type: String, required: true },
    artist: { type: String, required: true },
    genre: String,
    metadata: {
        album: String,
        duration: Number,
        tags: [String]
    },
    embedding: {
        type: [Number], // Vector embedding (768 or 1536 dimensions)
        default: []
    },
    popularityScore: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Vector Search Index (For MongoDB Atlas Vector Search compatibility)
SongSchema.index({ embedding: '2dsphere' }); // Note: Real vector search usually requires Atlas Search Index config
SongSchema.index({ popularityScore: -1 });

module.exports = mongoose.model('Song', SongSchema);
