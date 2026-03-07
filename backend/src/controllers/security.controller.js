const User = require('../models/User');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');

// @desc    Change Password
// @route   POST /api/users/security/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(401).json({ message: 'Invalid current password' });

        // Strength validation (min 8 chars, 1 number, 1 uppercase)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: 'Password must be 8+ chars, 1 uppercase, 1 number' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Setup 2FA (Generate QR)
// @route   POST /api/users/security/2fa/setup
exports.setup2FA = async (req, res, next) => {
    try {
        const secret = speakeasy.generateSecret({ name: `MusicFlow (${req.user.email})` });

        const user = await User.findById(req.user._id);
        user.twoFactorSecret = secret.base32;
        await user.save();

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        res.json({ qrCodeUrl, secret: secret.base32 });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify 2FA
// @route   POST /api/users/security/2fa/verify
exports.verify2FA = async (req, res, next) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id);

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.is2FAEnabled = true;
            await user.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ message: 'Invalid 2FA token' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get Active Sessions
// @route   GET /api/users/security/sessions
exports.getSessions = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('activeSessions loginLog');
        res.json({ sessions: user.activeSessions, logs: user.loginLog });
    } catch (error) {
        next(error);
    }
};

// @desc    Logout Session
// @route   DELETE /api/users/security/sessions/:id
exports.logoutSession = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.activeSessions = user.activeSessions.filter(s => s.sessionId !== req.params.id);
        await user.save();
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
