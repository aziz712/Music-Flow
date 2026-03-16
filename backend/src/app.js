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
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://music-flow-aziz712s-projects.vercel.app',
    'https://music-flow.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow all localhost origins
        if (origin.startsWith('http://localhost:')) return callback(null, true);

        // Allow all Vercel domains (for preview and production deployments)
        if (origin.endsWith('.vercel.app')) return callback(null, true);

        // Allow any production domains specifically listed here if any
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);

        console.warn(`CORS Error: Origin not allowed: ${origin}`);
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Basic security middleware, but we ensure it doesn't break streaming
app.use(securityMiddleware);
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
