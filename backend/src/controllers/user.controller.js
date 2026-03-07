const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ name, email, password });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            favorites: user.favorites,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
                isVerified: user.isVerified
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.trackListeningHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            const { songId } = req.body;
            // Keep last 50 songs
            user.listeningHistory.unshift(songId);
            if (user.listeningHistory.length > 50) {
                user.listeningHistory.pop();
            }
            await user.save();
            res.json({ message: 'History updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            const { songId } = req.body;
            const index = user.favorites.indexOf(songId);
            if (index > -1) {
                user.favorites.splice(index, 1);
            } else {
                user.favorites.push(songId);
            }
            await user.save();
            res.json({ favorites: user.favorites });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const youtubeService = require('../services/youtube.service');
        const favorites = [];
        // Sequential fetch to avoid hitting YT quotas too fast, last 20 reversed
        const favoriteIds = user.favorites.slice(-20).reverse();

        for (const id of favoriteIds) {
            try {
                const results = await youtubeService.search(id);
                if (results && results.length > 0) {
                    favorites.push(results[0]);
                }
            } catch (e) {
                console.error(`Failed to fetch favorite ${id}:`, e.message);
            }
        }
        res.json(favorites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Soft Delete Account
// @route   DELETE /api/users/profile
exports.deleteAccount = async (req, res, next) => {
    try {
        const { password } = req.body;
        const user = await User.findById(req.user._id);

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

        user.isDeleted = true;
        user.deletionGracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await user.save();

        res.json({ success: true, message: 'Account scheduled for deletion' });
    } catch (error) {
        next(error);
    }
};
