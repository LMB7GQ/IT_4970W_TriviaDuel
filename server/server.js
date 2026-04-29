const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const cors       = require('cors');
const mongoose   = require('mongoose');
require('dotenv').config();

const questionRoutes = require('./routes/questionRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const initSocket     = require('./socket/matchSocket');
const { socketAuth } = require('./middleware/auth');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const app    = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://main.d3k5x7fpwc60ay.amplifyapp.com',
    ],
    methods: ['GET', 'POST'],
  },
});

// ── MongoDB ─────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// ── Middleware (MUST BE FIRST) ──────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://main.d3k5x7fpwc60ay.amplifyapp.com',
  ],
}));

app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);


// ── Socket.io ───────────────────────────────────────────────────
io.use(socketAuth);
initSocket(io);

// ── Boot ────────────────────────────────────────────────────────
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});