const express = require('express');
const cors = require('cors');
const compression = require('compression');
const securityMiddleware = require('./middlewares/security.middleware');
const songRoutes = require('./routes/song.routes');
const userRoutes = require('./routes/user.routes');
const downloadRoutes = require('./routes/download.routes');
const playlistRoutes = require('./routes/playlist.routes');
const securityRoutes = require('./routes/security.routes');
const notificationRoutes = require('./routes/notification.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const { errorHandler } = require('./middlewares/error.middleware');


const app = express();

// Middlewares
app.use(cors());
app.use(securityMiddleware); // Custom hardened security & CSP
app.use(express.json());

// Optimized Cache-Control Middleware
app.use((req, res, next) => {
    if (req.method === 'GET') {
        if (req.path.includes('/trending') || req.path.includes('/recommendations')) {
            res.set('Cache-Control', 'public, max-age=3600');
        } else {
            res.set('Cache-Control', 'no-store');
        }
    }
    next();
});

// Routes
app.use('/api/songs', songRoutes);
app.use('/api/users', userRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Root Endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Music App API is running 🚀' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
