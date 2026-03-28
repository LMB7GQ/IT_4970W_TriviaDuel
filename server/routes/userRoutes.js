const express = require('express');
const router = express.Router();
const { getUser, createUser, login, getLeaderboard } = require('../controllers/userController');

router.get('/leaderboard', getLeaderboard);
router.post('/login', login);
router.post('/', createUser);
router.get('/:username', getUser);

module.exports = router;
