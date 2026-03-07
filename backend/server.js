require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
require('./src/jobs/cleanup.job');
require('./src/jobs/recommendation.job');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);

    // Dependency Health Check
    console.log('--- Dependency Check ---');
    try {
        const isWindows = process.platform === 'win32';
        const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');

        if (fs.existsSync(binPath)) {
            console.log(`✅ yt-dlp found at: ${binPath}`);
            if (!isWindows) {
                fs.chmodSync(binPath, '755');
                console.log('✅ yt-dlp permissions fixed');
            }
        } else {
            console.error(`❌ yt-dlp NOT FOUND at: ${binPath}`);
        }

        try {
            const ffmpegVer = execSync('ffmpeg -version').toString().split('\n')[0];
            console.log(`✅ ${ffmpegVer}`);
        } catch (e) {
            console.error('❌ FFmpeg NOT FOUND or not in PATH');
        }
    } catch (e) {
        console.error('Dependency check failed:', e.message);
    }
    console.log('------------------------');
});
