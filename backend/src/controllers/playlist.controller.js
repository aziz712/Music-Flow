const Playlist = require('../models/Playlist');

exports.createPlaylist = async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        const playlist = await Playlist.create({
            name,
            description,
            user: req.user._id,
            isPublic
        });
        res.status(201).json(playlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserPlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.find({ user: req.user._id });
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPlaylistById = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        // Check if private and not owned by user
        if (!playlist.isPublic && playlist.user.toString() !== req.user?._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updatePlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        if (playlist.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        playlist.name = req.body.name || playlist.name;
        playlist.description = req.body.description || playlist.description;
        playlist.isPublic = req.body.isPublic !== undefined ? req.body.isPublic : playlist.isPublic;

        const updatedPlaylist = await playlist.save();
        res.json(updatedPlaylist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        if (playlist.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await playlist.deleteOne();
        res.json({ message: 'Playlist removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addSongToPlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        if (playlist.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { title, artist, link, cover, duration } = req.body;
        playlist.songs.push({ title, artist, link, cover, duration });

        await playlist.save();
        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeSongFromPlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        if (playlist.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        playlist.songs = playlist.songs.filter(song => song._id.toString() !== req.params.songId);

        await playlist.save();
        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
