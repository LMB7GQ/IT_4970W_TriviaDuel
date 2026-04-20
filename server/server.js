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
const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://main.d3k5x7fpwc60ay.amplifyapp.com', "null", null], 
    methods: ['GET', 'POST'],
  },
});

const port = process.env.PORT || 5000;

// ── MongoDB ─────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://main.d3k5x7fpwc60ay.amplifyapp.com',
  ],
}));
app.use(express.json());

// ── REST Routes ─────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/users', userRoutes);

// ── Socket.io ───────────────────────────────────────────────────
io.use(socketAuth);
initSocket(io);

// ── Boot ────────────────────────────────────────────────────────
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});