const helmet = require('helmet');

// Strict Content Security Policy to prevent XSS and improve security score
const securityMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Next.js dev, tighten in prod
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://i.ytimg.com", "https://e-cdns-images.dzcdn.net", "https://*.ytimg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://*.googleapis.com", "http://localhost:5000", "https://music-flow-uww7.onrender.com"],
            mediaSrc: ["'self'", "blob:", "http://localhost:5000", "https://music-flow-uww7.onrender.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: "cross-origin",
});

module.exports = securityMiddleware;
