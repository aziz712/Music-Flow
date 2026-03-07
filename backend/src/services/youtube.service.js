const ytSearch = require('yt-search');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');

// Simple in-memory cache for stream URLs to avoid re-spawning yt-dlp
const urlCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

exports.search = async (query) => {
    try {
        const result = await ytSearch(query);
        const videos = result.videos.slice(0, 10);

        return videos.map(video => ({
            id: video.videoId,
            title: video.title,
            artist: {
                name: video.author?.name || 'Unknown Artist'
            },
            album: {
                title: "YouTube",
                cover_small: video.thumbnail || video.thumbnails?.[0]?.url || '',
                cover_medium: video.thumbnail || video.thumbnails?.[0]?.url || '',
                cover_big: video.thumbnail || video.thumbnails?.[0]?.url || '',
                cover_xl: video.thumbnail || video.thumbnails?.[0]?.url || ''
            },
            duration: video.duration?.seconds || 0,
            preview: "",
            link: video.url,
            source: 'youtube'
        }));
    } catch (error) {
        console.error("YouTube Search Error:", error);
        return [];
    }
};

exports.streamProxy = (url, res) => {
    const binPath = path.join(BIN_DIR, 'yt-dlp.exe');
    // Check Cache
    const cached = urlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        
        pipeTranscodedAudio(cached.url, res);
        return;
    }

    const ytdl = spawn(binPath, [url, '-g', '-f', 'bestaudio']);
    let audioUrl = '';

    

    ytdl.stdout.on('data', (data) => audioUrl += data.toString());
    ytdl.stderr.on('data', (data) => console.error(`yt-dlp stderr: ${data}`));

    ytdl.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp failed with code ${code}`);
            if (!res.headersSent) res.status(500).send("Extraction Failed");
            return;
        }
        const cleanUrl = audioUrl.trim();
        if (!cleanUrl) {
            console.error("No YouTube audio URL extracted");
            if (!res.headersSent) res.status(500).send("No URL found");
            return;
        }

        
        urlCache.set(url, { url: cleanUrl, timestamp: Date.now() });
        pipeTranscodedAudio(cleanUrl, res);
    });
};

const pipeTranscodedAudio = (targetUrl, expressRes) => {
    

    expressRes.setHeader('Content-Type', 'audio/mpeg');
    expressRes.setHeader('Transfer-Encoding', 'chunked');
    expressRes.setHeader('Cache-Control', 'no-cache');
    expressRes.setHeader('Access-Control-Allow-Origin', '*');
    expressRes.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    expressRes.setHeader('Accept-Ranges', 'bytes');

    const ffmpegPath = 'ffmpeg'; // or e.g. 'C:\\ffmpeg\\ffmpeg.exe'
    

    const ffmpegProcess = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', targetUrl,
        '-f', 'mp3',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-ar', '44100',
        '-map', 'a',
        'pipe:1'
    ]);

    ffmpegProcess.stdout.pipe(expressRes);

    ffmpegProcess.stderr.on('data', (data) => {
        if (data.toString().includes('Error')) {
            console.error(`FFmpeg Error: ${data}`);
        }
    });

    ffmpegProcess.on('close', (code) => {
        
        if (code !== 0 && code !== null) {
            console.error(`FFmpeg process failed!`);
        }
    });

    expressRes.on('close', () => {
        
        ffmpegProcess.kill('SIGKILL');
    });
};

exports.getVideoInfo = async (url) => {
    const binPath = path.join(BIN_DIR, 'yt-dlp.exe');
    return new Promise((resolve, reject) => {
        const ytdlp = spawn(binPath, [url, '--dump-json']);
        let data = '';
        ytdlp.stdout.on('data', (chunk) => data += chunk);
        ytdlp.on('close', (code) => {
            if (code === 0) resolve(JSON.parse(data));
            else reject(new Error(`Exit code ${code}`));
        });
    });
}
