const axios = require('axios');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const os = require('os');
const youtubeService = require('../services/youtube.service');

// @desc    Download multiple songs as ZIP
// @route   POST /api/download/bulk
exports.downloadBulk = async (req, res) => {
    const { songs } = req.body; // Expects array of { title, artist, downloadUrl }

    if (!songs || !Array.isArray(songs) || songs.length === 0) {
        return res.status(400).json({ message: 'No songs provided' });
    }

    if (songs.length > 20) {
        return res.status(400).json({ message: 'Max 20 songs per request' });
    }

    const archive = archiver('zip', {
        zlib: { level: 9 } // Highest compression
    });

    res.header('Content-Type', 'application/zip');
    res.header('Content-Disposition', 'attachment; filename="songs.zip"');

    archive.pipe(res);

    // Track failures but continue
    const errors = [];

    for (const song of songs) {
        try {
            const { title, artist, downloadUrl } = song;

            // Validate URL (basic check)
            if (!downloadUrl || !downloadUrl.startsWith('http')) {
                errors.push({ song: `${artist} - ${title}`, error: 'Invalid URL' });
                continue;
            }

            // Stream download
            let stream;
            const isYouTube = downloadUrl.includes('youtube.com') || downloadUrl.includes('youtu.be');

            if (isYouTube) {
                stream = youtubeService.getStream(downloadUrl);
            } else {
                const response = await axios({
                    method: 'GET',
                    url: downloadUrl,
                    responseType: 'stream'
                });
                stream = response.data;
            }

            // Add stream to archive
            // Sanitize filename
            const filename = `${artist || 'Unknown'} - ${title || 'Unknown'}.mp3`.replace(/[^a-z0-9 \.-]/gi, '_');
            archive.append(stream, { name: filename });

        } catch (error) {
            console.error(`Failed to download ${song.title}:`, error.message);
            errors.push({ song: song.title, error: error.message });
        }
    }

    try {
        await archive.finalize();
    } catch (err) {
        console.error("Archive error:", err);
        if (!res.headersSent) res.status(500).send("Archive Error");
    }
};
