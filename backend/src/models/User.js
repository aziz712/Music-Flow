const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },

    // Security & Sessions
    twoFactorSecret: { type: String },
    is2FAEnabled: { type: Boolean, default: false },
    activeSessions: [{
        sessionId: String,
        device: String,
        ip: String,
        lastActivity: { type: Date, default: Date.now }
    }],
    loginLog: [{
        ip: String,
        userAgent: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Subscription
    subscription: {
        tier: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        currentPeriodEnd: Date,
        cancelAtPeriodEnd: { type: Boolean, default: false }
    },

    // Notifications
    notificationPreferences: {
        email: { type: Boolean, default: true },
        productUpdates: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true }, // Forced ON in logic
        weeklyDigest: { type: Boolean, default: false }
    },

    // Interaction & Recommendations
    favorites: [{ type: String }],
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    searchHistory: [{ type: String }],
    listeningHistory: [{ type: String }],
    likedSongs: [{ type: String }],
    skippedSongs: [{ type: String }],

    // AI Recommendation Engine Data
    tasteVector: { type: [Number], default: [] },
    clusterId: { type: String },

    // Deletion
    isDeleted: { type: Boolean, default: false },
    deletionGracePeriodEnd: Date
}, { timestamps: true });

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(12); // Cost 12 as requested
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
