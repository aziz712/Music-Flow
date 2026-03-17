const ytSearch = require('yt-search');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const fs = require('fs');
const https = require('https');
const { Innertube, UniversalCache } = require('youtubei.js');

// These are session-bound tokens to bypass "Sign in to confirm you're not a bot"
const DEFAULT_VISITOR_DATA = "Cgt4OTl5elhPNUlvOCi81uLNBjIKCgJUThIEGgAgQmLfAgrcAjE2LllUPVgwM1plSGpzNjZybHo2SEwwUVU4Q3dzMzZLUTJuZC1fN0t1N0ViMkNNZ3M5b3djeDhWUjZaVnNQcE9TUnJvZzN2eXV4MXRjQXBsdllFSWpwVktBRjJoanJhZmtPeDBjdE5TX0Z0eDJWSzFGaVlXNlRON01IcUFQNGQ0dzJfY1NYSVJ4X1ZTNFFqdHBhbkRhNVRQVDhIOHVrUTVkMW9tV3RYNVVHVjk4TDdMbFEwWHhJVHJZeTY2aGlSZm1hTm5aZlNNTE9ZWDVVZEZqRWJ4aXB4bmtiVGdVQlFTSVdSZU01VmNlTkY5N0hZSmNKN2M3WEk1SHR4cDB3QVhhdEdfNTQ5Y1hkRVRlaVYyRXFQQmNlblIxaHp2UlQ4SXViSzZndFh1Qk5ZbnJvVFhyTFVyVFZ4OWo3UDYxTUxqV3o3Y0JUUUptcFJWbERkUnV1UHhtZTJURzdrZw==";
const DEFAULT_PO_TOKEN = "MlOf4yezUFrFl5_f5as_wcRchC9EzFrz4JZznIR1zACbNAxBWBtAZJUk1-GqkFXjy5KYxt8YFLugonHJV3rRgzqLZuBOyIH6XgxL2j4Zl4BWMwAPAw==";

// Production-Grade Extraction Queue to prevent HTTP 429
class ExtractionQueue {
    constructor(concurrency = 1) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const res = await task();
                    resolve(res);
                } catch (err) {
                    reject(err);
                }
            });
            this.next();
        });
    }

    async next() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const task = this.queue.shift();
        try {
            await task();
        } finally {
            this.running--;
            this.next();
        }
    }
}

const extractionQueue = new ExtractionQueue(1); // Single-threaded extraction for cloud IPs

let innerTube;
const getInnerTube = async (client = 'WEB') => {
    if (!innerTube || client !== 'WEB') {
        const isWindows = process.platform === 'win32';
        const options = {
            cache: new UniversalCache(false),
            generate_session_locally: true
        };

        // Use tokens if provided in env
        if (process.env.YT_VISITOR_DATA) options.visitor_data = process.env.YT_VISITOR_DATA;
        if (process.env.YT_PO_TOKEN) options.po_token = process.env.YT_PO_TOKEN;

        // Fallback to defaults ONLY in production if not provided specifically
        if (!isWindows) {
            if (!options.visitor_data) options.visitor_data = DEFAULT_VISITOR_DATA;
            if (!options.po_token) options.po_token = DEFAULT_PO_TOKEN;
        }

        const yt = await Innertube.create(options);
        if (client === 'WEB') innerTube = yt;
        return yt;
    }
    return innerTube;
};

// Ensure yt-dlp is updated on startup (Production only)
// Ensure yt-dlp is updated on startup (Local only - avoid rate limits in production startup)
if (process.platform === 'win32') {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    console.log("Checking for yt-dlp updates...");
    const updater = spawn(binPath, ['-U']);
    updater.stdout.on('data', (d) => console.log(`yt-dlp-update: ${d}`));
    updater.stderr.on('data', (d) => console.warn(`yt-dlp-update-err: ${d}`));
}

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
    let poToken = process.env.YT_PO_TOKEN;
    let visitorData = process.env.YT_VISITOR_DATA;

    // Fallback to defaults ONLY in production if not provided in env
    if (!isWindows) {
        if (!poToken) poToken = DEFAULT_PO_TOKEN;
        if (!visitorData) visitorData = DEFAULT_VISITOR_DATA;
    }

    const cookiesPath = path.join(process.platform === 'win32' ? process.env.TEMP || 'C:\\Windows\\Temp' : '/tmp', 'yt_cookies.txt');

    // QUEUED TASK: Wrap extraction in the queue to prevent 429s
    extractionQueue.add(async () => {
        // Double check cache inside queue
        const cachedInside = urlCache.get(url);
        if (cachedInside && Date.now() - cachedInside.timestamp < CACHE_TTL) {
            pipeNativeAudio(cachedInside.url, req, res, isDownload);
            return;
        }

        console.log(`Initiatin extraction for: ${url} (Concurrency: ${extractionQueue.running})`);

        // Use multiple clients and geo-bypass to reduce bot detection
        const args = [
            url,
            '-g',
            '-f', 'bestaudio', // Let yt-dlp pick the best available format (webm or m4a)
            '--geo-bypass',
            '--no-playlist',
            '--sleep-interval', '1',
            '--max-sleep-interval', '3'
        ];

        if (!isWindows) {
            // PRODUCTION (Render/Linux): Use robust clients and correctly formatted tokens
            // yt-dlp expects "CLIENT.CONTEXT+PO_TOKEN" for each context
            // We provide tokens for all clients we use to ensure stability
            const contexts = [
                'web.player', 'web.gvs',
                'android.player', 'android.gvs',
                'ios.player', 'ios.gvs',
                'tv.player', 'tv.gvs'
            ];
            const formattedPo = poToken ? contexts.map(ctx => `${ctx}+${poToken}`).join(',') : '';

            // Prioritize android and ios clients which are more resilient
            args.push('--extractor-args', `youtube:player-client=android,ios,tvhtml5,web${formattedPo ? `;po_token=${formattedPo}` : ''}${visitorData ? `;visitor_data=${visitorData}` : ''}`);

            // Prefer m4a for better browser compatibility
            args[args.indexOf('-f') + 1] = 'bestaudio[ext=m4a]/bestaudio/best';

            // Add more IP-friendly options for Render
            args[args.indexOf('--sleep-interval') + 1] = '2';
            args[args.indexOf('--max-sleep-interval') + 1] = '5';
        } else {
            // WINDOWS (Local): Keep it simple. Only add extractor-args if tokens are explicitly provided.
            if (poToken || visitorData) {
                let extractorArgs = `youtube:player-client=ios,web,mweb`;
                if (poToken) extractorArgs += `;po_token=${poToken}`;
                if (visitorData) extractorArgs += `;visitor_data=${visitorData}`;
                args.push('--extractor-args', extractorArgs);
            }
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
                    console.log("Using provided YouTube cookies (Netscape format file).");
                } catch (err) {
                    console.error("Failed to write YouTube cookies to temp file:", err.message);
                }
            } else {
                // PRODUCTION UPGRADE: Always write cookies to file even if raw header format
                // yt-dlp is much more stable with --cookies than --add-header "Cookie:..."
                try {
                    fs.writeFileSync(cookiesPath, `# Netscape HTTP Cookie File\n${cookiesStr}`);
                    args.push('--cookies', cookiesPath);
                    console.log("Using provided YouTube cookies (Raw -> File conversion).");
                } catch (err) {
                    args.push('--add-header', `Cookie:${cookiesStr}`);
                    console.warn("Failed to write raw cookies; falling back to header:", err.message);
                }
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

                // FALLBACK: Use youtubei.js (InnerTube) with client rotation if yt-dlp is blocked
                const performFallback = async () => {
                    const clients = ['ANDROID', 'IOS', 'TVHTML5', 'YTMUSIC', 'WEB'];
                    for (const clientName of clients) {
                        try {
                            console.log(`Fallback attempt using ${clientName} client...`);
                            const yt = await getInnerTube(clientName);
                            const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();

                            // Innertube.create already has our poToken/visitorData
                            const info = await yt.getBasicInfo(videoId, clientName);
                            const format = info.chooseFormat({ type: 'audio', quality: 'best' });

                            if (format && format.url) {
                                console.log(`Fallback success: Extracted URL via InnerTube (${clientName}) for ${videoId}`);
                                urlCache.set(url, { url: format.url, timestamp: Date.now() });
                                pipeNativeAudio(format.url, req, res, isDownload);
                                return true;
                            }
                        } catch (err) {
                            console.warn(`${clientName} fallback failed:`, err.message);
                        }
                    }
                    return false;
                };

                performFallback().then(success => {
                    if (!success && !res.headersSent) {
                        res.status(500).json({
                            error: "Extraction Failed",
                            details: "YouTube is blocking all extraction methods. Try again later."
                        });
                    }
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
    }); // End of extractionQueue.add
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
