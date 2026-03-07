const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [{
        title: String,
        artist: String,
        link: String,
        cover: String,
        duration: Number
    }],
    isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Playlist', PlaylistSchema);
