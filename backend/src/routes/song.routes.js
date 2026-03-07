const express = require('express');
const router = express.Router();
const songController = require('../controllers/song.controller');

const { protect, optionalProtect } = require('../middlewares/auth.middleware');

router.get('/search', songController.searchSongs);
router.post('/bulk', songController.bulkSearch);
router.get('/download', songController.downloadSong);
router.get('/resolve', songController.resolveVideoId);
router.get('/trending', songController.getTrending);
router.get('/recommendations', optionalProtect, songController.getRecommendations);
router.get('/:id', songController.getSongDetails);
router.get('/similar/:id', songController.getSimilarSongs);
router.post('/interaction', optionalProtect, songController.recordInteraction);

module.exports = router;
