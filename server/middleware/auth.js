const jwt  = require('jsonwebtoken');
const User = require('../models/user');

// ── REST route middleware ────────────────────────────────────────
// Protects any Express route — attach to routes that require login
// Usage: router.get('/me', protect, getMe)
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (excluding passwordHash)
    req.user = await User.findById(decoded.id).select('-passwordHash');

    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Socket middleware ────────────────────────────────────────────
// Verifies JWT on socket connection handshake
// Usage: io.use(socketAuth) — called once per socket connection
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      // Allow guest connections without token — socket.data.user will be null
      socket.data.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      socket.data.user = null;
      return next();
    }

    // Attach full user to socket for use in any event handler
    socket.data.user = {
      id:       user._id.toString(),
      username: user.username,
      rank:     user.rank,
      wins:     user.wins,
      losses:   user.losses,
    };

    next();
  } catch (err) {
    // Invalid token — treat as guest rather than blocking connection
    socket.data.user = null;
    next();
  }
};

module.exports = { protect, socketAuth };