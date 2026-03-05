const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

// ── MongoDB Connection ──────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// ── Question Model ──────────────────────────────────────────────
const Question = mongoose.model('Question', new mongoose.Schema({
  question: String,
  answer: String,
}));

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Game state ──────────────────────────────────────────────────
const waitingPlayers = [];
const rooms = {};
const playerToRoom = {};

// ── REST endpoint ───────────────────────────────────────────────
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// ── Socket.io ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('joinGame', async (playerName) => {
    console.log(`${playerName} is joining...`);

    waitingPlayers.push({ socketId: socket.id, name: playerName });

    if (waitingPlayers.length === 2) {
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();

      const roomId = `room_${Date.now()}`;

      // Fetch questions from MongoDB
      const questions = await Question.find();

      rooms[roomId] = {
        roomId,
        players: {
          [player1.socketId]: { id: player1.socketId, name: player1.name, score: 0 },
          [player2.socketId]: { id: player2.socketId, name: player2.name, score: 0 }
        },
        currentQuestionIndex: 0,
        gameActive: true,
        answers: {},
        questions  // pulled from DB, stored on the room
      };

      playerToRoom[player1.socketId] = roomId;
      playerToRoom[player2.socketId] = roomId;

      io.to(player1.socketId).emit('matchFound', { roomId, opponent: player2.name, currentQuestion: questions[0] });
      io.to(player2.socketId).emit('matchFound', { roomId, opponent: player1.name, currentQuestion: questions[0] });

      console.log(`Room created: ${roomId}`);
    } else {
      socket.emit('waiting', { message: 'Waiting for another player...' });
    }
  });

  socket.on('submitAnswer', (data) => {
    const roomId = playerToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    const { questions } = room;
    room.answers[socket.id] = data.answer;

    const playerIds = Object.keys(room.players);
    const allAnswered = playerIds.every(pid => room.answers[pid] !== undefined);

    if (allAnswered) {
      const currentQuestion = questions[room.currentQuestionIndex];
      const results = {};

      playerIds.forEach(playerId => {
        const playerAnswer = room.answers[playerId];
        const isCorrect = playerAnswer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();

        if (isCorrect) room.players[playerId].score += 1;

        results[playerId] = {
          playerName: room.players[playerId].name,
          answered: playerAnswer,
          correct: isCorrect,
          score: room.players[playerId].score
        };
      });

      room.answers = {};
      room.currentQuestionIndex += 1;

      const gameOver = room.currentQuestionIndex >= questions.length;

      playerIds.forEach(playerId => {
        const nextQuestion = !gameOver ? questions[room.currentQuestionIndex] : null;
        io.to(playerId).emit('roundResults', { results, nextQuestion, gameOver });
      });

      if (gameOver) room.gameActive = false;
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    const roomId = playerToRoom[socket.id];
    if (roomId && rooms[roomId]) {
      const otherPlayerId = Object.keys(rooms[roomId].players).find(pid => pid !== socket.id);
      if (otherPlayerId) {
        io.to(otherPlayerId).emit('opponentDisconnected', { message: 'Opponent disconnected' });
      }
      delete rooms[roomId];
    }

    delete playerToRoom[socket.id];

    const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
    if (index !== -1) waitingPlayers.splice(index, 1);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});