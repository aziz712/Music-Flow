const ytSearch = require('yt-search');
const { BIN_DIR } = require('ytdlp-nodejs');
const path = require('path');
const { spawn } = require('child_process');
const { PassThrough } = require('stream');
const fs = require('fs');
const https = require('https');
const { Innertube, UniversalCache } = require('youtubei.js');
const cacheService = require('./cache.service');
const queueService = require('./queue.service');

// These are session-bound tokens to bypass "Sign in to confirm you're not a bot"
const DEFAULT_VISITOR_DATA = "Cgt4OTl5elhPNUlvOCj35OLNBjIKCgJUThIEGgAgQmLfAgrcAjE2LllUPVgwM1plSGpzNjZybHo2SEwwUVU4Q3dzMzZLUTJuZC1fN0t1N0ViMkNNZ3M5b3djeDhWUjZaVnNQcE9TUnJvZzN2eXV4MXRjQXBsdllFSWpwVktBRjJoanJhZmtPeDBjdE5TX0Z0eDJWSzFGaVlXNlRON01IcUFQNGQ0dzJfY1NYSVJ4X1ZTNFFqdHBhbkRhNVRQVDhIOHVrUTVkMW9tV3RYNVVHVjk4TDdMbFEwWHhJVHJZeTY2aGlSZm1hTm5aZlNNTE9ZWDVVZEZqRWJ4aXB4bmtiVGdVQlFTSVdSZU01VmNlTkY5N0hZSmNKN2M3WEk1SHR4cDB3QVhhdEdfNTQ5Y1hkRVRlaVYyRXFQQmNlblIxaHp2UlQ4SXViSzZndFh1Qk5ZbnJvVFhyTFVyVFZ4OWo3UDYxTUxqV3o3Y0JUUUptcFJWbERkUnV1UHhtZTJURzdrZw==";
const DEFAULT_PO_TOKEN = "MlPqnxyOzHXoIuqj6Qex64MEVyXhXuFFfUFc7SqXGMJb0Xy9z-yj1V1RtWyB6ziKsLxxQ9eOXPCV8pFoOS-jEAZwFxuxhRR8-juK0IyJGV1B9yBYuQ==";


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

const streamCachedFile = (filePath, res, req, isDownload, videoId) => {
    try {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;

        const headers = {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin'
        };

        if (isDownload) {
            let title = req?.query?.title || 'Unknown Title';
            let artist = req?.query?.artist || 'Unknown Artist';
            let safeFilename = `${artist} - ${title}.mp3`.replace(/[^a-zA-Z0-9 \-()_.]/g, '');
            if (!safeFilename.trim() || safeFilename === '.mp3') safeFilename = `${videoId}.mp3`;
            headers['Content-Disposition'] = `attachment; filename="${safeFilename}"`;
            headers['Content-Length'] = fileSize;
            res.status(200).set(headers);
            fs.createReadStream(filePath).pipe(res);
            return;
        }

        if (req.headers.range) {
            const parts = req.headers.range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
            headers['Content-Length'] = chunksize;
            headers['Accept-Ranges'] = 'bytes';
            res.status(206).set(headers);
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            headers['Content-Length'] = fileSize;
            headers['Accept-Ranges'] = 'bytes';
            res.status(200).set(headers);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (e) {
        console.error(`[STREAM ERROR] Could not read cache file ${filePath}:`, e.message);
        if (!res.headersSent) res.status(500).json({ error: 'Streaming Error' });
    }
};

const downloadAndCacheAudio = async (url, videoId, cachePath) => {
    const isWindows = process.platform === 'win32';
    const binPath = path.join(BIN_DIR, isWindows ? 'yt-dlp.exe' : 'yt-dlp');

    const cookiesStr = process.env.YT_COOKIES;
    let poToken = process.env.YT_PO_TOKEN || DEFAULT_PO_TOKEN;
    let visitorData = process.env.YT_VISITOR_DATA || DEFAULT_VISITOR_DATA;
    const cookiesPath = path.join(process.platform === 'win32' ? process.env.TEMP || 'C:\\Windows\\Temp' : '/tmp', 'yt_cookies.txt');

    const tempCachePath = `${cachePath}.part`;

    const attemptExtraction = (useCookies) => {
        return new Promise((resolve) => {
            const spawnArgs = [
                url,
                '-f', 'bestaudio/best', // Broaden format selection
                '--no-playlist',
                '--geo-bypass',
                '--force-ipv4', // Bypass flagged IPv6 ranges on Render
                '-o', '-' // Output to stdout
            ];

            if (!isWindows) {
                const contexts = ['web.player', 'web.gvs', 'android.player', 'android.gvs', 'ios.player', 'ios.gvs', 'tv.player', 'tv.gvs'];
                const formattedPo = poToken ? contexts.map(ctx => `${ctx}+${poToken}`).join(',') : '';
                spawnArgs.push('--extractor-args', `youtube:player-client=android,web,tv${formattedPo ? `;po_token=${formattedPo}` : ''}${visitorData ? `;visitor_data=${visitorData}` : ''}`);
            } else {
                if (poToken || visitorData) {
                    spawnArgs.push('--extractor-args', `youtube:player-client=android,web,tv${poToken ? `;po_token=${poToken}` : ''}${visitorData ? `;visitor_data=${visitorData}` : ''}`);
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

            console.log(`[DOWNLOAD START] Spawning yt-dlp for ${videoId} [Cookies: ${useCookies}]...`);
            const ytdl = spawn(binPath, spawnArgs);
            if (!isWindows) {
                try { fs.chmodSync(binPath, '755'); } catch (e) { }
            }

            const ffmpeg = spawn('ffmpeg', [
                '-i', 'pipe:0',
                '-f', 'mp3',
                '-acodec', 'libmp3lame',
                '-ab', '128k',
                '-y',
                tempCachePath
            ]);

            let ytdlError = '';
            let ffmpegError = '';

            ytdl.stdout.pipe(ffmpeg.stdin);

            ytdl.stderr.on('data', (d) => {
                const str = d.toString();
                if (str.includes('ERROR') || str.includes('Warning')) ytdlError += str;
            });

            ffmpeg.stderr.on('data', (d) => {
                ffmpegError += d.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0 && fs.existsSync(tempCachePath) && fs.statSync(tempCachePath).size > 0) {
                    fs.renameSync(tempCachePath, cachePath);
                    console.log(`[DOWNLOAD COMPLETE] Cached ${videoId}`);
                    resolve(true);
                } else {
                    if (fs.existsSync(tempCachePath)) fs.unlinkSync(tempCachePath);
                    console.error(`[FFMPEG ERROR] Extraction failed for ${videoId}: Exited with code ${code}. ytdlp error: ${ytdlError}`);
                    resolve(false);
                }
            });

            ytdl.on('error', (err) => {
                console.error(`yt-dlp spawn error: ${err.message}`);
                resolve(false);
            });

            ffmpeg.on('error', (err) => {
                console.error(`ffmpeg spawn error: ${err.message}`);
                resolve(false);
            });
        });
    };

    let success = await attemptExtraction(true);
    if (!success && cookiesStr) {
        console.warn(`[RETRY] Primary extraction failed for ${videoId}. Retrying in GUEST MODE...`);
        success = await attemptExtraction(false);
    }

    if (!success) {
        console.error(`[STREAM ERROR] yt-dlp definitively failed for ${videoId}. Attempting InnerTube rotation...`);
        const performFallback = async () => {
            const clients = ['ANDROID', 'WEB']; // Dropped IOS and TVHTML5 entirely
            for (const clientName of clients) {
                try {
                    console.log(`[RETRY] Fallback attempt using InnerTube ${clientName} client...`);
                    const yt = await getInnerTube();
                    const info = await yt.getBasicInfo(videoId, { client: clientName });
                    const format = info.chooseFormat({ type: 'audio', quality: 'best' });

                    if (format && format.url) {
                        console.log(`[FALLBACK HIT] Extracted URL via InnerTube (${clientName}). Downloading with ffmpeg...`);
                        const downloadSuccess = await new Promise((resolve) => {
                            const userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
                            const ffmpegFallback = spawn('ffmpeg', [
                                '-headers', `User-Agent: ${userAgentFallback}\r\n`,
                                '-i', format.url,
                                '-f', 'mp3',
                                '-acodec', 'libmp3lame',
                                '-ab', '128k',
                                '-y',
                                tempCachePath
                            ]);

                            ffmpegFallback.on('close', (code) => {
                                if (code === 0 && fs.existsSync(tempCachePath) && fs.statSync(tempCachePath).size > 0) {
                                    fs.renameSync(tempCachePath, cachePath);
                                    console.log(`[DOWNLOAD COMPLETE] Cached ${videoId} via fallback`);
                                    resolve(true);
                                } else {
                                    if (fs.existsSync(tempCachePath)) fs.unlinkSync(tempCachePath);
                                    resolve(false);
                                }
                            });

                            ffmpegFallback.on('error', () => resolve(false));
                        });
                        if (downloadSuccess) return true;
                    }
                } catch (err) {
                    console.warn(`[FALLBACK ERROR] ${clientName} failed:`, err.message);
                }
            }
            return false;
        };

        success = await performFallback();

        if (!success) {
            throw new Error("All extraction methods exhausted.");
        }
    }
};

exports.streamProxy = async (url, res, req, isDownload = false) => {
    const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
    const cachePath = cacheService.getCachePath(videoId);

    console.log(`[STREAM REQUEST] Initiating stream for ${videoId}`);

    if (cacheService.isCached(videoId)) {
        console.log(`[CACHE HIT] Streaming ${videoId} instantly.`);
        return streamCachedFile(cachePath, res, req, isDownload, videoId);
    }

    console.log(`[CACHE MISS] Queuing extraction for ${videoId}. [Waiting: ${queueService.getWaitingCount()}]`);

    try {
        await queueService.addJob(async () => {
            if (cacheService.isCached(videoId)) {
                return;
            }
            await downloadAndCacheAudio(url, videoId, cachePath);
        });

        // If the cache was successfully built, stream the new file
        if (cacheService.isCached(videoId)) {
            return streamCachedFile(cachePath, res, req, isDownload, videoId);
        } else {
            throw new Error("Unable to retrieve audio data");
        }
    } catch (err) {
        console.error(`[STREAM ERROR] ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Streaming Failed', details: err.message });
        }
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
