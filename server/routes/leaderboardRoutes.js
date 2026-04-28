const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET leaderboard
router.get('/', async (req, res) => {
  try {
    console.log("Leaderboard endpoint hit");

    const users = await User.find({})
      .sort({ wins: -1 })
      .limit(10);

    console.log("Users found:", users.length);

    res.json(users);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;