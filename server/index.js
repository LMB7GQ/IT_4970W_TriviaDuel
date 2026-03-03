const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const questions = require('./questions');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Game state
const waitingPlayers = [];
const rooms = {};
const playerToRoom = {};

// REST endpoint (for testing)
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Player joins game
  socket.on('joinGame', (playerName) => {
    console.log(`${playerName} is joining...`);
    
    waitingPlayers.push({ 
      socketId: socket.id, 
      name: playerName 
    });

    // If 2 players are waiting, create a room
    if (waitingPlayers.length === 2) {
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();
      
      const roomId = `room_${Date.now()}`;
      
      rooms[roomId] = {
        roomId,
        players: {
          [player1.socketId]: { 
            id: player1.socketId, 
            name: player1.name, 
            score: 0 
          },
          [player2.socketId]: { 
            id: player2.socketId, 
            name: player2.name, 
            score: 0 
          }
        },
        currentQuestionIndex: 0,
        gameActive: true,
        answers: {}
      };

      playerToRoom[player1.socketId] = roomId;
      playerToRoom[player2.socketId] = roomId;

      // Notify both players they're matched
      io.to(player1.socketId).emit('matchFound', {
        roomId,
        opponent: player2.name,
        currentQuestion: questions[0]
      });

      io.to(player2.socketId).emit('matchFound', {
        roomId,
        opponent: player1.name,
        currentQuestion: questions[0]
      });

      console.log(`Room created: ${roomId}`);
    } else {
      // Waiting for another player
      socket.emit('waiting', { message: 'Waiting for another player...' });
    }
  });

  // Player submits an answer
  socket.on('submitAnswer', (data) => {
    const roomId = playerToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    room.answers[socket.id] = data.answer;
    
    // Check if both players have answered
    const playerIds = Object.keys(room.players);
    const allAnswered = playerIds.every(pid => room.answers[pid] !== undefined);

    if (allAnswered) {
      const currentQuestion = questions[room.currentQuestionIndex];
      const results = {};

      playerIds.forEach(playerId => {
        const playerAnswer = room.answers[playerId];
        const isCorrect = playerAnswer.toLowerCase().trim() === 
                         currentQuestion.answer.toLowerCase().trim();
        
        if (isCorrect) {
          room.players[playerId].score += 1;
        }

        results[playerId] = {
          playerName: room.players[playerId].name,
          answered: playerAnswer,
          correct: isCorrect,
          score: room.players[playerId].score
        };
      });

      // Clear answers for next question
      room.answers = {};
      room.currentQuestionIndex += 1;

      // Send results to both players
      playerIds.forEach(playerId => {
        const nextQuestion = room.currentQuestionIndex < questions.length 
          ? questions[room.currentQuestionIndex] 
          : null;

        io.to(playerId).emit('roundResults', {
          results,
          nextQuestion,
          gameOver: room.currentQuestionIndex >= questions.length
        });
      });

      if (room.currentQuestionIndex >= questions.length) {
        room.gameActive = false;
      }
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const roomId = playerToRoom[socket.id];
    if (roomId && rooms[roomId]) {
      // Notify other player
      const otherPlayerId = Object.keys(rooms[roomId].players)
        .find(pid => pid !== socket.id);
      
      if (otherPlayerId) {
        io.to(otherPlayerId).emit('opponentDisconnected', {
          message: 'Opponent disconnected'
        });
      }

      delete rooms[roomId];
    }

    delete playerToRoom[socket.id];
    
    // Remove from waiting list
    const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
