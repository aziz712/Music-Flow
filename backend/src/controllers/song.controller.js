const youtubeService = require('../services/youtube.service');
const deezerService = require('../services/deezer.service');
const recommendationService = require('../services/recommendation.service');
const SongInteraction = require('../models/SongInteraction');

// @desc    Search for songs (Switched to YouTube)
// @route   GET /api/songs/search
exports.searchSongs = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }

        // Primary: YouTube Search
        const songs = await youtubeService.search(q);
        res.json(songs);
    } catch (error) {
        next(error);
    }
};

// @desc    Get song details + lyrics
// @route   GET /api/songs/:id
exports.getSongDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        res.json({ id, title: "YouTube Track" });
    } catch (error) {
        next(error);
    }
};

// @desc    Download/Stream Song
// @route   GET /api/songs/download
exports.downloadSong = async (req, res, next) => {
    try {
        let { url, title, artist } = req.query;
        let downloadUrl = null;

        // 1. Priority: Title + Artist Search (YouTube) - Most robust for playing/downloading
        if (title && artist) {
            const query = `${artist} - ${title} audio`;
            try {
                const searchResults = await youtubeService.search(query);
                if (searchResults && searchResults.length > 0) {
                    downloadUrl = searchResults[0].link;
                }
            } catch (e) {
                console.error("Smart search failed:", e.message);
            }
        }

        // 2. Fallback: If no smart match, check if original URL is valid YouTube
        if (!downloadUrl && url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
            downloadUrl = url;
        }

        // 3. Stream if we have a valid YouTube URL
        if (downloadUrl) {
            const handleFallback = async (err) => {
                console.warn("YouTube streaming failed, attempting Deezer fallback:", err.message);
                try {
                    if (title && artist) {
                        const tracks = await deezerService.searchTracks(`${artist} - ${title}`);
                        if (tracks && tracks.length > 0 && tracks[0].preview) {
                            console.log(`Fallback Success: Redirecting to Deezer preview`);
                            return res.redirect(tracks[0].preview);
                        }
                    }
                    if (!res.headersSent) {
                        res.status(500).json({ message: "Could not stream from YouTube or Deezer. Please try another song." });
                    }
                } catch (fallbackError) {
                    console.error("Fallback process failed:", fallbackError.message);
                    if (!res.headersSent) next(err);
                }
            };

            youtubeService.streamProxy(downloadUrl, res, handleFallback);
            return;
        }

        // 4. Last Resort: If original was Deezer, try to use Preview
        if (url && url.includes('deezer.com/track/')) {
            try {
                // Extract ID
                const id = url.split('track/')[1];
                const track = await deezerService.getTrackDetails(id);
                if (track && track.preview) {
                    return res.redirect(track.preview);
                }
            } catch (e) {
                console.error("Deezer fallback failed:", e.message);
            }
        }

        // 5. Give up
        return res.status(404).json({ message: 'Could not find a downloadable source. Please try searching for this song directly.' });

    } catch (error) {
        console.error("Download Error:", error);

        // 4. Emergency Fallback: If YouTube Totally Fails (e.g. Code 1 Bot Block)
        // We try to find it on Deezer and redirect to preview
        try {
            const { title, artist } = req.query;
            if (title && artist) {
                console.log(`Fallback: Searching Deezer for ${artist} - ${title}`);
                const tracks = await deezerService.searchTracks(`${artist} - ${title}`);
                if (tracks && tracks.length > 0 && tracks[0].preview) {
                    console.log(`Fallback Success: Redirecting to Deezer preview`);
                    return res.redirect(tracks[0].preview);
                }
            }
        } catch (fallbackError) {
            console.error("Emergency Fallback Failed:", fallbackError.message);
        }

        if (!res.headersSent) next(error);
    }
};

// @desc    Bulk search songs
// @route   POST /api/songs/bulk
exports.bulkSearch = async (req, res, next) => {
    try {
        const { songs } = req.body;
        if (!songs || !Array.isArray(songs)) {
            return res.status(400).json({ message: 'Please provide an array of song names' });
        }

        const results = [];
        for (const query of songs) {
            const tracks = await youtubeService.search(query);
            if (tracks && tracks.length > 0) {
                results.push(tracks[0]);
            }
        }

        res.json(results);
    } catch (error) {
        next(error);
    }
};

// @desc    Get similar songs (Advanced Scoring Engine)
// @route   GET /api/songs/similar/:id
exports.getSimilarSongs = async (req, res, next) => {
    try {
        const { id } = req.params;
        const song = await deezerService.getTrackDetails(id);

        if (!song) {
            return res.status(404).json({ message: 'Song not found' });
        }

        const artistTracks = await deezerService.searchTracks(`artist:"${song.artist.name}"`);
        const titleTracks = await deezerService.searchTracks(`track:"${song.title}"`);

        const pool = [...artistTracks, ...titleTracks];
        const uniquePoolMap = new Map();
        pool.forEach(item => {
            if (item.id !== parseInt(id)) {
                uniquePoolMap.set(item.id, item);
            }
        });
        const uniquePool = Array.from(uniquePoolMap.values());

        const scoredDefaults = uniquePool.map(candidate => {
            let score = 0;
            if (candidate.artist.name === song.artist.name) score += 50;
            if (candidate.album.title === song.album.title) score += 30;
            score += (candidate.rank / 100000);
            return { ...candidate, score };
        });

        scoredDefaults.sort((a, b) => b.score - a.score);

        res.json(scoredDefaults.slice(0, 10));
    } catch (error) {
        next(error);
    }
};

// @desc    Resolve YouTube Video ID from Title/Artist
// @route   GET /api/songs/resolve
exports.resolveVideoId = async (req, res, next) => {
    try {
        const { title, artist } = req.query;
        if (!title || !artist) return res.status(400).json({ message: "Title and Artist required" });

        const query = `${artist} - ${title} official video`;
        const results = await youtubeService.search(query);

        if (results && results.length > 0) {
            return res.json({ videoId: results[0].id });
        }

        return res.status(404).json({ message: "Video not found" });
    } catch (error) {
        next(error);
    }
};

// @desc    Get trending songs
// @route   GET /api/songs/trending
exports.getTrending = async (req, res, next) => {
    try {
        // Search for current popular hits
        const trendingQueries = ['Top billboard songs 2024', 'Trending music hits', 'Popular songs 2024'];
        const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];

        const results = await youtubeService.search(randomQuery);
        res.json(results.slice(0, 12));
    } catch (error) {
        next(error);
    }
};

// @desc    Get intelligent recommendations
// @route   GET /api/songs/recommendations
exports.getRecommendations = async (req, res, next) => {
    try {
        const userId = req.user ? req.user._id : null;
        let recommendations = [];

        if (userId) {
            // Enterprise Tier: Intelligent Hybrid Recommendations
            recommendations = await recommendationService.getHybridRecommendations(userId);
        }

        // Fallback or cold start
        if (recommendations.length < 5) {
            const fallback = await youtubeService.search('Recommended for you music 2024');
            recommendations = [...recommendations, ...fallback].slice(0, 12);
        }

        res.json(recommendations.slice(0, 12));
    } catch (error) {
        next(error);
    }
};

// @desc    Record song interaction (Play, Like, etc)
// @route   POST /api/songs/interaction
exports.recordInteraction = async (req, res, next) => {
    try {
        const { songId, action, duration, metadata } = req.body;
        const userId = req.user ? req.user._id : null;

        // 1. Log the raw interaction (only if logged in, or anonymized if you prefer)
        if (userId) {
            await SongInteraction.create({
                userId,
                songId,
                action,
                durationPlayed: duration || 0,
                metadata: metadata || {},
                timestamp: new Date()
            });
        }

        // 2. AI feedback loop: Index song and update user taste
        // We use a background-like approach (no await for UX) or await for consistency
        const indexedSong = await recommendationService.indexSong({
            id: songId,
            title: metadata?.title || 'Unknown',
            artist: metadata?.artist || 'Unknown',
            metadata: { album_art: metadata?.image, ...metadata }
        });

        if (userId && (action === 'play' || action === 'like')) {
            const weight = action === 'like' ? 0.3 : 0.05; // Likes weigh more than plays
            await recommendationService.updateUserTasteVector(userId, songId, weight);
        }

        res.status(201).json({ success: true });
    } catch (error) {
        next(error);
    }
};
