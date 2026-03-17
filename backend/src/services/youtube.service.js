const ytSearch = require('yt-search');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const fs = require('fs');
const https = require('https');
const { Innertube, UniversalCache } = require('youtubei.js');

// These are session-bound tokens to bypass "Sign in to confirm you're not a bot"
const DEFAULT_VISITOR_DATA = "Cgt4OTl5elhPNUlvOCj35OLNBjIKCgJUThIEGgAgQmLfAgrcAjE2LllUPVgwM1plSGpzNjZybHo2SEwwUVU4Q3dzMzZLUTJuZC1fN0t1N0ViMkNNZ3M5b3djeDhWUjZaVnNQcE9TUnJvZzN2eXV4MXRjQXBsdllFSWpwVktBRjJoanJhZmtPeDBjdE5TX0Z0eDJWSzFGaVlXNlRON01IcUFQNGQ0dzJfY1NYSVJ4X1ZTNFFqdHBhbkRhNVRQVDhIOHVrUTVkMW9tV3RYNVVHVjk4TDdMbFEwWHhJVHJZeTY2aGlSZm1hTm5aZlNNTE9ZWDVVZEZqRWJ4aXB4bmtiVGdVQlFTSVdSZU01VmNlTkY5N0hZSmNKN2M3WEk1SHR4cDB3QVhhdEdfNTQ5Y1hkRVRlaVYyRXFQQmNlblIxaHp2UlQ4SXViSzZndFh1Qk5ZbnJvVFhyTFVyVFZ4OWo3UDYxTUxqV3o3Y0JUUUptcFJWbERkUnV1UHhtZTJURzdrZw==";
const DEFAULT_PO_TOKEN = "MlPqnxyOzHXoIuqj6Qex64MEVyXhXuFFfUFc7SqXGMJb0Xy9z-yj1V1RtWyB6ziKsLxxQ9eOXPCV8pFoOS-jEAZwFxuxhRR8-juK0IyJGV1B9yBYuQ==";

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
const getInnerTube = async () => {
    const isWindows = process.platform === 'win32';
    const options = {
        cache: new UniversalCache(false),
        generate_session_locally: true,
        retrieve_player: true,
        lang: 'en',
        location: 'US'
    };

    // Use tokens if provided in env
    let poToken = process.env.YT_PO_TOKEN || DEFAULT_PO_TOKEN;
    let visitorData = process.env.YT_VISITOR_DATA || DEFAULT_VISITOR_DATA;

    if (poToken) options.po_token = poToken;
    if (visitorData) options.visitor_data = visitorData;

    // Use a persistent cache for the WEB client to speed up search/initial loads
    if (!isWindows) {
        options.cache = new UniversalCache(true);
    }

    const yt = await Innertube.create(options);
    innerTube = yt;
    return yt;
};

// Ensure yt-dlp is updated on startup (Local only - avoid rate limits in production startup)
if (process.platform === 'win32') {
    const binPath = path.join(BIN_DIR, 'yt-dlp.exe');
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
            artist: { name: video.author?.name || 'Unknown Artist' },
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
    let poToken = process.env.YT_PO_TOKEN || DEFAULT_PO_TOKEN;
    let visitorData = process.env.YT_VISITOR_DATA || DEFAULT_VISITOR_DATA;
    const cookiesPath = path.join(process.platform === 'win32' ? process.env.TEMP || 'C:\\Windows\\Temp' : '/tmp', 'yt_cookies.txt');

    // QUEUED TASK: Wrap extraction in the queue to prevent 429s
    extractionQueue.add(async () => {
        // Double check cache inside queue
        const cachedInside = urlCache.get(url);
        if (cachedInside && Date.now() - cachedInside.timestamp < CACHE_TTL) {
            pipeNativeAudio(cachedInside.url, req, res, isDownload);
            return;
        }

        const attemptExtraction = (useCookies = true) => {
            return new Promise((resolve) => {
                // Use multiple clients and geo-bypass to reduce bot detection
                const spawnArgs = [
                    url,
                    '-g',
                    '-f', 'bestaudio',
                    '--geo-bypass',
                    '--no-playlist',
                    '--sleep-interval', '2',
                    '--max-sleep-interval', '5',
                    '--force-ipv4', // Bypass flagged IPv6 ranges on Render
                    '--add-header', 'sec-ch-ua:"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    '--add-header', 'sec-ch-ua-mobile:?0',
                    '--add-header', 'sec-ch-ua-platform:"Windows"'
                ];

                if (!isWindows) {
                    const contexts = ['web.player', 'web.gvs', 'android.player', 'android.gvs', 'ios.player', 'ios.gvs', 'tv.player', 'tv.gvs'];
                    // Apply PoToken to all relevant contexts
                    const formattedPo = poToken ? contexts.map(ctx => `${ctx}+${poToken}`).join(',') : '';
                    spawnArgs.push('--extractor-args', `youtube:player-client=tvhtml5,ios,android,web${formattedPo ? `;po_token=${formattedPo}` : ''}${visitorData ? `;visitor_data=${visitorData}` : ''}`);
                    spawnArgs[spawnArgs.indexOf('-f') + 1] = 'bestaudio[ext=m4a]/bestaudio/best';
                } else {
                    if (poToken || visitorData) {
                        spawnArgs.push('--extractor-args', `youtube:player-client=ios,web,mweb${poToken ? `;po_token=${poToken}` : ''}${visitorData ? `;visitor_data=${visitorData}` : ''}`);
                    }
                }

                spawnArgs.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

                if (useCookies && cookiesStr) {
                    try {
                        const formattedCookies = (cookiesStr.includes('\t') || cookiesStr.startsWith('#'))
                            ? (cookiesStr.startsWith('#') ? cookiesStr : `# Netscape HTTP Cookie File\n${cookiesStr}`)
                            : `# Netscape HTTP Cookie File\n${cookiesStr}`;
                        fs.writeFileSync(cookiesPath, formattedCookies);
                        spawnArgs.push('--cookies', cookiesPath);
                    } catch (err) {
                        spawnArgs.push('--add-header', `Cookie:${cookiesStr}`);
                    }
                }

                console.log(`Spawning yt-dlp [Cookies: ${useCookies}, IP: ${extractionQueue.running}]...`);
                const ytdl = spawn(binPath, spawnArgs);
                let audioUrl = '';

                if (!isWindows) {
                    try { fs.chmodSync(binPath, '755'); } catch (e) { }
                }

                ytdl.stdout.on('data', (d) => audioUrl += d.toString());
                ytdl.stderr.on('data', (d) => {
                    const str = d.toString();
                    if (str.includes('ERROR') || str.includes('Warning')) console.error(`yt-dlp stderr: ${str}`);
                });

                ytdl.on('close', (code) => {
                    resolve({ code, url: audioUrl.trim() });
                });
            });
        };

        // PHASE 2.1 FLOW: Primary (Cookies) -> Secondary (Guest Mode) -> Fallback (InnerTube Rotation)
        let result = await attemptExtraction(true);

        if (result.code !== 0 && cookiesStr) {
            console.warn(`Primary extraction failed for ${url}. Retrying in GUEST MODE...`);
            result = await attemptExtraction(false);
        }

        if (result.code !== 0) {
            console.error(`yt-dlp definitively failed for ${url}. Attempting InnerTube rotation...`);

            const performFallback = async () => {
                // Corrected client names and options for InnerTube v17
                const clients = ['TVHTML5', 'ANDROID', 'IOS', 'WEB'];
                for (const clientName of clients) {
                    try {
                        console.log(`Fallback attempt using ${clientName} client...`);
                        const yt = await getInnerTube();
                        const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();

                        // Pass client as an option object correctly
                        const info = await yt.getBasicInfo(videoId, { client: clientName });
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

            const success = await performFallback();
            if (!success && !res.headersSent) {
                res.status(500).json({ error: "YouTube Extraction Failed", details: "All bypass methods exhausted (Phase 2.1)." });
            }
            return;
        }

        const cleanUrl = result.url;
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

    if (expressReq && expressReq.headers.range && !isDownload) {
        options.headers['Range'] = expressReq.headers.range;
    }

    const request = https.get(options, (response) => {
        expressRes.status(response.statusCode);
        const headers = { ...response.headers };
        headers['Content-Type'] = response.headers['content-type'] || 'audio/mp4';
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Cross-Origin-Resource-Policy'] = 'cross-origin';

        if (isDownload) {
            let title = expressReq?.query?.title || 'Unknown Title';
            let artist = expressReq?.query?.artist || 'Unknown Artist';
            let safeFilename = `${artist} - ${title}.m4a`.replace(/[^a-zA-Z0-9 \-()_.]/g, '');
            if (!safeFilename.trim() || safeFilename === '.m4a') safeFilename = 'song.m4a';
            headers['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
        } else {
            headers['Accept-Ranges'] = 'bytes';
            headers['Connection'] = 'keep-alive';
        }

        expressRes.set(headers);
        response.pipe(expressRes);
    });

    request.on('error', (err) => {
        console.error("Native pipe error:", err.message);
        if (!expressRes.headersSent) expressRes.status(500).send("Streaming error");
    });

    if (expressReq) {
        expressReq.on('close', () => request.destroy());
    }
};

exports.getStream = (url) => {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
    const cookiesStr = process.env.YT_COOKIES;
    const args = [url, '-f', 'bestaudio', '-o', '-', '--no-playlist'];
    if (cookiesStr && !cookiesStr.includes('\t') && !cookiesStr.startsWith('#')) {
        args.push('--add-header', `Cookie:${cookiesStr}`);
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
