const bcrypt = require('bcrypt');
const User = require('../models/user');

const SALT_ROUNDS = 8;

// GET /api/users/:username — get user by username (for profile, rank lookup)
async function getUser(req, res) {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      username: user.username,
      rank: user.rank,
      wins: user.wins,
      losses: user.losses,
      streak: user.streak,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/users — create account (username + password stored in DB)
async function createUser(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      username: normalizedUsername,
      passwordHash,
    });

    res.status(201).json({
      id: user._id,
      username: user.username,
      rank: user.rank,
      wins: user.wins,
      losses: user.losses,
      streak: user.streak,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}

// POST /api/users/login — verify username + password
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      rank: user.rank,
      wins: user.wins,
      losses: user.losses,
      streak: user.streak,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/users/leaderboard — top users by rank
async function getLeaderboard(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const users = await User.find()
      .sort({ rank: -1 })
      .limit(limit)
      .select('username rank wins losses streak');

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/users/profilePic — update the logged-in user's profile picture index
async function updateProfilePic(req, res) {
  try {
    const { profilePic } = req.body;
    if (typeof profilePic !== 'number' || profilePic < 0 || profilePic > 11) {
      return res.status(400).json({ error: 'Invalid profilePic value' });
    }
    await User.findByIdAndUpdate(req.user._id, { profilePic });
    res.json({ profilePic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getUser,
  createUser,
  login,
  getLeaderboard,
  updateProfilePic,
};
