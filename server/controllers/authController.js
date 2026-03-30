const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User   = require('../models/user');

// ── Helper: generate JWT ─────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── POST /api/auth/register ──────────────────────────────────────
const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already taken
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: username.toLowerCase(),
      passwordHash,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id:       user._id,
        username: user.username,
        rank:     user.rank,
        wins:     user.wins,
        losses:   user.losses,
        streak:   user.streak,
      },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id:       user._id,
        username: user.username,
        rank:     user.rank,
        wins:     user.wins,
        losses:   user.losses,
        streak:   user.streak,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────
// Returns the currently logged in user — requires protect middleware
const getMe = async (req, res) => {
  res.json({
    user: {
      id:       req.user._id,
      username: req.user.username,
      rank:     req.user.rank,
      wins:     req.user.wins,
      losses:   req.user.losses,
      streak:   req.user.streak,
    },
  });
};

module.exports = { register, login, getMe };