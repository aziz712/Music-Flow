const ytSearch = require('yt-search');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const fs = require('fs');

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

exports.streamProxy = (url, res, onError) => {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    // Check Cache
    const cached = urlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        pipeTranscodedAudio(cached.url, res);
        return;
    }

    // Use multiple clients and geo-bypass to reduce bot detection
    const args = [
        url,
        '-g',
        '-f', 'bestaudio',
        '--extractor-args', 'youtube:player-client=ios,web,mweb',
        '--geo-bypass',
        '--no-playlist',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    const ytdl = spawn(binPath, args);
    let audioUrl = '';

    // Fix permissions on Linux/Docker/Render
    if (!isWindows) {
        try {
            fs.chmodSync(binPath, '755');
        } catch (e) {
            console.error("Could not set yt-dlp permissions:", e.message);
        }
    }

    ytdl.stdout.on('data', (data) => audioUrl += data.toString());
    ytdl.stderr.on('data', (data) => {
        const stderrStr = data.toString();
        if (stderrStr.includes('ERROR') || stderrStr.includes('Warning')) {
            console.error(`yt-dlp stderr: ${stderrStr}`);
        }
    });

    ytdl.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp failed with code ${code} for URL: ${url}`);
            if (onError) {
                onError(new Error(`yt-dlp failed with code ${code}`));
            } else {
                if (!res.headersSent) res.status(500).json({
                    error: "Extraction Failed",
                    code: code,
                    details: "YouTube is blocking the request. Try another song or search directly."
                });
            }
            return;
        }
        const cleanUrl = audioUrl.trim();
        if (!cleanUrl) {
            console.error("No YouTube audio URL extracted");
            if (onError) {
                onError(new Error("No URL found"));
            } else {
                if (!res.headersSent) res.status(500).send("No URL found");
            }
            return;
        }

        urlCache.set(url, { url: cleanUrl, timestamp: Date.now() });
        pipeTranscodedAudio(cleanUrl, res, onError);
    });
};

const pipeTranscodedAudio = (targetUrl, expressRes, onError) => {
    expressRes.setHeader('Content-Type', 'audio/mpeg');
    expressRes.setHeader('Transfer-Encoding', 'chunked');
    expressRes.setHeader('Cache-Control', 'no-cache');
    expressRes.setHeader('Access-Control-Allow-Origin', '*');
    expressRes.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    expressRes.setHeader('Accept-Ranges', 'bytes');

    const ffmpegPath = 'ffmpeg';

    try {
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

        ffmpegProcess.on('error', (err) => {
            console.error("FFmpeg failed to start:", err.message);
            if (onError) onError(err);
        });

        ffmpegProcess.stderr.on('data', (data) => {
            if (data.toString().includes('Error')) {
                console.error(`FFmpeg Error: ${data}`);
            }
        });

        ffmpegProcess.on('close', (code) => {
            if (code !== 0 && code !== null) {
                console.error(`FFmpeg process failed with code ${code} for target: ${targetUrl.substring(0, 100)}...`);
                // We can't really fallback here as headers are usually sent
            }
        });

        expressRes.on('close', () => {
            ffmpegProcess.kill('SIGKILL');
        });
    } catch (e) {
        console.error("Critical FFmpeg spawn error:", e.message);
        if (onError) onError(e);
    }
};

exports.getVideoInfo = async (url) => {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
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
