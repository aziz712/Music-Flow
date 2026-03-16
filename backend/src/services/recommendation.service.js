const SongInteraction = require('../models/SongInteraction');
const User = require('../models/User');
const Song = require('../models/Song');
const youtubeService = require('./youtube.service');

/**
 * Math Utility: Cosine Similarity
 */
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Mock Embedding Generator (Deterministic fallback if no OpenAI key)
 */
const generateEmbedding = async (text) => {
    // In production, call OpenAI API or local MiniLM
    // For now, generate a deterministic vector based on text hash
    const dimensions = 1536; // OpenAI standard
    const vector = new Array(dimensions).fill(0);
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < dimensions; i++) {
        vector[i] = Math.sin(hash + i) * 0.1; // Simulated semantic space
    }
    return vector;
};

/**
 * Update User Taste Vector (Adaptive Learning)
 */
exports.updateUserTasteVector = async (userId, songId, weight = 0.1) => {
    try {
        const user = await User.findById(userId);
        const song = await Song.findOne({ songId });

        if (!user || !song || song.embedding.length === 0) return;

        // Cumulative Moving Average for taste vector
        const currentVector = user.tasteVector.length > 0 ? user.tasteVector : new Array(song.embedding.length).fill(0);
        const newVector = currentVector.map((val, i) => (val * (1 - weight)) + (song.embedding[i] * weight));

        user.tasteVector = newVector;
        await user.save();
    } catch (error) {
        console.error("Taste Vector Update Error:", error);
    }
};

/**
 * Master Hybrid Ranking Pipeline
 */
exports.getHybridRecommendations = async (userId) => {
    try {
        const user = await User.findById(userId).lean();
        if (!user) return [];

        const userVector = user.tasteVector;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // 1. Fetch Candidates (Vector Similarity + Trending + Cluster)
        // In Atlas, this would be { $vectorSearch: ... }
        // Here, we fetch a pool of songs to rank
        const songPool = await Song.find({
            songId: { $nin: user.listeningHistory || [] } // Avoid already played
        }).limit(200).lean();

        // 2. Ranking Strategy
        const scoredRecommendations = songPool.map(song => {
            // Factor 1: Content Similarity (0.5)
            const similarity = userVector.length > 0 ? cosineSimilarity(userVector, song.embedding) : 0.5;

            // Factor 2: Popularity Boost (0.2)
            const popularity = Math.min(song.popularityScore / 1000, 1);

            // Factor 3: Freshness (0.15)
            const freshness = song.lastUpdated > sevenDaysAgo ? 1 : 0.5;

            // Factor 4: Explorer Bonus (0.05) - Random variation to prevent echo chambers
            const explorerBonus = Math.random() * 0.1;

            const finalScore = (similarity * 0.5) + (popularity * 0.2) + (freshness * 0.15) + (explorerBonus * 0.1);

            let reason = "Because of your taste";
            if (popularity > 0.8) reason = "Trending currently";
            if (freshness > 0.9 && similarity < 0.3) reason = "Discover something new";

            return {
                ...song,
                id: song.songId,
                score: finalScore,
                reason
            };
        });

        // 3. Sort and Return
        scoredRecommendations.sort((a, b) => b.score - a.score);

        const results = scoredRecommendations.slice(0, 15).map(s => ({
            id: s.id,
            title: s.title,
            artist: { name: s.artist },
            image: s.metadata?.album_art || `https://img.youtube.com/vi/${s.id}/0.jpg`,
            link: `https://www.youtube.com/watch?v=${s.id}`,
            duration: s.metadata?.duration || 0,
            reason: s.reason,
            score: s.score
        }));

        // If pool is small, supplement with YouTube search
        if (results.length < 8) {
            const fallback = await youtubeService.search('Trending 2024 music');
            return [...results, ...fallback.slice(0, 12)].slice(0, 12);
        }

        return results;
    } catch (error) {
        console.error("AI Recommendation Error:", error);
        return [];
    }
};

/**
 * Song Metadata Enrichment & Embedding Generation
 */
exports.indexSong = async (songData) => {
    try {
        let song = await Song.findOne({ songId: songData.id });
        if (!song) {
            const embedding = await generateEmbedding(`${songData.title} ${songData.artist}`);
            song = await Song.create({
                songId: songData.id,
                title: songData.title,
                artist: typeof songData.artist === 'string' ? songData.artist : songData.artist.name,
                embedding,
                metadata: songData.metadata || {}
            });
        } else {
            song.popularityScore += 1;
            song.lastUpdated = new Date();
            await song.save();
        }
        return song;
    } catch (error) {
        console.error("Song Indexing Error:", error);
    }
};
