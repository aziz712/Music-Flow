const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../../cache/audio');
const MAX_CACHE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB limit for Render free tier

// Ensure cache directory exists synchronously on startup
try {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        console.log(`✅ [CACHE] Initialized cache directory at ${CACHE_DIR}`);
    }
} catch (err) {
    console.error(`❌ [CACHE] Failed to create cache directory: ${err.message}`);
}

exports.getCachePath = (videoId) => {
    // Sanitize videoId to prevent directory traversal
    const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(CACHE_DIR, `${safeId}.mp3`);
};

exports.isCached = (videoId) => {
    return fs.existsSync(this.getCachePath(videoId));
};

exports.cleanupCache = async () => {
    try {
        if (!fs.existsSync(CACHE_DIR)) return;

        const files = fs.readdirSync(CACHE_DIR).map(file => {
            const filePath = path.join(CACHE_DIR, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                path: filePath,
                size: stats.size,
                mtime: stats.mtime.getTime()
            };
        });

        // Calculate total size
        let totalSize = files.reduce((acc, file) => acc + file.size, 0);

        if (totalSize > MAX_CACHE_SIZE_BYTES) {
            console.log(`🧹 [CACHE] Size (${(totalSize / 1e9).toFixed(2)}GB) exceeds limit. Cleaning up...`);

            // Sort by oldest first
            files.sort((a, b) => a.mtime - b.mtime);

            for (const file of files) {
                if (totalSize <= MAX_CACHE_SIZE_BYTES) break;
                try {
                    fs.unlinkSync(file.path);
                    totalSize -= file.size;
                    console.log(`🗑️ [CACHE] Deleted oldest file: ${file.name}`);
                } catch (e) {
                    console.error(`❌ [CACHE] Failed to delete file ${file.name}: ${e.message}`);
                }
            }
            console.log(`🧹 [CACHE] Cleanup complete. New size: ${(totalSize / 1e9).toFixed(2)}GB`);
        }
    } catch (err) {
        console.error(`❌ [CACHE] Cleanup failed: ${err.message}`);
    }
};

// Start a scheduled task to clean up the cache every hour
setInterval(this.cleanupCache, 60 * 60 * 1000);
