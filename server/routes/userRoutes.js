const express = require('express');
const router = express.Router();
const { getUser, createUser, login, getLeaderboard, updateProfilePic } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/leaderboard', getLeaderboard);
router.post('/login', login);
router.post('/', createUser);
router.put('/profilePic', protect, updateProfilePic);
router.get('/:username', getUser);

module.exports = router;
