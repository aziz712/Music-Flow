const ytSearch = require('yt-search');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const fs = require('fs');
const https = require('https');
const { Innertube } = require('youtubei.js');

let innerTube;
const getInnerTube = async () => {
    if (!innerTube) {
        innerTube = await Innertube.create();
    }
    return innerTube;
};

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

exports.streamProxy = (url, res, req, isDownload = false) => {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    // Check Cache
    const cached = urlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        pipeNativeAudio(cached.url, req, res, isDownload);
        return;
    }

    const cookiesStr = process.env.YT_COOKIES;
    const poToken = process.env.YT_PO_TOKEN;
    const cookiesPath = path.join(process.platform === 'win32' ? process.env.TEMP || 'C:\\Windows\\Temp' : '/tmp', 'yt_cookies.txt');

    // Use multiple clients and geo-bypass to reduce bot detection
    const args = [
        url,
        '-g',
        '-f', 'bestaudio', // Let yt-dlp pick the best available format (webm or m4a)
        '--geo-bypass',
        '--no-playlist'
    ];

    if (!isWindows) {
        // PRODUCTION (Render/Linux): Use only ios/android clients which are more resilient to bot blocks on cloud IPs.
        // We remove 'web,mweb' here as they are the primary source of 'Sign in to confirm you are not a bot'.
        args.push('--extractor-args', `youtube:player-client=ios,android${poToken ? `;po_token=${poToken}` : ''}`);
        // Prefer m4a for better browser compatibility
        args[args.indexOf('-f') + 1] = 'bestaudio[ext=m4a]/bestaudio/best';
    } else if (poToken) {
        args.push('--extractor-args', `youtube:player-client=ios,web,mweb;po_token=${poToken}`);
    }

    // Add generic user agent
    args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // If cookies are provided in env, we apply them
    if (cookiesStr) {
        if (cookiesStr.includes('\t') || cookiesStr.startsWith('#')) {
            // Likely a Netscape file content
            try {
                const formattedCookies = cookiesStr.startsWith('#') ? cookiesStr : `# Netscape HTTP Cookie File\n${cookiesStr}`;
                fs.writeFileSync(cookiesPath, formattedCookies);
                args.push('--cookies', cookiesPath);
                console.log("Using provided YouTube cookies (Netscape format).");
            } catch (err) {
                console.error("Failed to write YouTube cookies to temp file:", err.message);
            }
        } else {
            // Likely a raw cookie header string (e.g. GPS=1; YSC=...)
            args.push('--add-header', `Cookie:${cookiesStr}`);
            console.log("Using provided YouTube cookies (Raw Header format).");
        }
    }

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
            console.error(`yt-dlp failed with code ${code} for URL: ${url}. Attempting youtubei.js fallback...`);

            // FALLBACK: Use youtubei.js (InnerTube) if yt-dlp is blocked
            getInnerTube().then(async (yt) => {
                try {
                    const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
                    const info = await yt.getBasicInfo(videoId);
                    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

                    if (format && format.url) {
                        console.log(`Fallback success: Extracted URL via InnerTube for ${videoId}`);
                        urlCache.set(url, { url: format.url, timestamp: Date.now() });
                        pipeNativeAudio(format.url, req, res, isDownload);
                    } else {
                        throw new Error("No format found via fallback");
                    }
                } catch (fallbackErr) {
                    console.error("Fallback extraction also failed:", fallbackErr.message);
                    if (!res.headersSent) res.status(500).json({
                        error: "Extraction Failed",
                        details: "YouTube is blocking both standard and fallback extraction. Try again later."
                    });
                }
            }).catch(innerTubeErr => {
                console.error("InnerTube initialization failed:", innerTubeErr.message);
                if (!res.headersSent) res.status(500).send("Extraction engine error");
            });
            return;
        }
        const cleanUrl = audioUrl.trim();
        if (!cleanUrl) {
            console.error("No YouTube audio URL extracted");
            if (!res.headersSent) res.status(500).send("No URL found");
            return;
        }

        console.log(`Successfully extracted URL for ${url.substring(0, 30)}...`);
        urlCache.set(url, { url: cleanUrl, timestamp: Date.now() });
        pipeNativeAudio(cleanUrl, req, res, isDownload);
    });
};

const pipeNativeAudio = (targetUrl, expressReq, expressRes, isDownload = false) => {
    const urlObj = new URL(targetUrl);

    const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
    };

    // Forward the Range header to YouTube for seeking support
    if (expressReq && expressReq.headers.range && !isDownload) {
        options.headers['Range'] = expressReq.headers.range;
    }

    const request = https.get(options, (response) => {
        // Forward HTTP status (could be 200 OK or 206 Partial Content)
        expressRes.status(response.statusCode);

        const headers = { ...response.headers };

        // Critical headers for mobile browsers and audio elements
        headers['Content-Type'] = response.headers['content-type'] || 'audio/mp4';
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Cross-Origin-Resource-Policy'] = 'cross-origin';

        if (isDownload) {
            let title = expressReq?.query?.title || 'Unknown Title';
            let artist = expressReq?.query?.artist || 'Unknown Artist';

            // Sanitize filename for HTTP header safety and filesystem compatibility
            let safeFilename = `${artist} - ${title}.m4a`.replace(/[^a-zA-Z0-9 \-()_.]/g, '');
            if (!safeFilename.trim() || safeFilename === '.m4a') {
                safeFilename = 'song.m4a';
            }

            headers['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
        } else {
            headers['Accept-Ranges'] = 'bytes';
            headers['Connection'] = 'keep-alive';
        }

        expressRes.set(headers);

        // Pipe directly to client! Huge CPU save!
        response.pipe(expressRes);
    });

    request.on('error', (err) => {
        console.error("Native pipe error:", err.message);
        if (!expressRes.headersSent) {
            expressRes.status(500).send("Streaming error");
        }
    });

    if (expressReq) {
        expressReq.on('close', () => {
            request.destroy(); // Stop fetching if client disconnects
        });
    }
};

exports.getStream = (url) => {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    const cookiesStr = process.env.YT_COOKIES;

    const args = [url, '-f', 'bestaudio', '-o', '-', '--no-playlist'];
    if (cookiesStr) {
        if (!cookiesStr.includes('\t') && !cookiesStr.startsWith('#')) {
            args.push('--add-header', `Cookie:${cookiesStr}`);
        }
    }

    const ytdl = spawn(binPath, args);
    return ytdl.stdout;
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
};
