const { getRandomCategories, fetchMatchQuestions } = require('../scripts/matchUtils');

// ── In-memory game state ────────────────────────────────────────
const waitingPlayers = [];
const rooms          = {};
const playerToRoom   = {};

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ── joinGame ──────────────────────────────────────────────
    socket.on('joinGame', async ({ playerName, rank = 500 }) => {
      console.log(`${playerName} (rank: ${rank}) is joining...`);

      waitingPlayers.push({ socketId: socket.id, name: playerName, rank });

      if (waitingPlayers.length >= 2) {
        const player1 = waitingPlayers.shift();
        const player2 = waitingPlayers.shift();
        const roomId  = `room_${Date.now()}`;

        const categories = getRandomCategories(5);
        const { questionsForClient, questionsForServer } = await fetchMatchQuestions(categories);

        rooms[roomId] = {
          roomId,
          categories,
          // ✅ FIX: store explicit player order so p1/p2 is always guaranteed
          playerOrder: [player1.socketId, player2.socketId],
          players: {
            [player1.socketId]: { id: player1.socketId, name: player1.name, rank: player1.rank, score: 0 },
            [player2.socketId]: { id: player2.socketId, name: player2.name, rank: player2.rank, score: 0 },
          },
          questionsForServer,
          banPick: {
            bans: [],
            pick: null,
            phase: 'ban1',  // ban1 → ban2 → pick → playing
          },
          categoryResults: {},
          currentCategory: null,
          currentQuestionIndex: 0,
          roundAnswers: {},
          gameActive: true,
        };

        playerToRoom[player1.socketId] = roomId;
        playerToRoom[player2.socketId] = roomId;

        const p1Socket = io.sockets.sockets.get(player1.socketId);
        const p2Socket = io.sockets.sockets.get(player2.socketId);
        if (p1Socket) p1Socket.join(roomId);
        if (p2Socket) p2Socket.join(roomId);

        const matchPayload = (myId, opponentName, opponentRank) => ({
          roomId,
          myId,
          opponent: { name: opponentName, rank: opponentRank },
          categories,
          questions: questionsForClient,
          banPick: { phase: 'ban1', turn: player1.socketId }, // p1 always bans first
        });

        io.to(player1.socketId).emit('matchReady', matchPayload(player1.socketId, player2.name, player2.rank));
        io.to(player2.socketId).emit('matchReady', matchPayload(player2.socketId, player1.name, player1.rank));

        console.log(`Room created: ${roomId} | Categories: ${categories.join(', ')}`);
      } else {
        socket.emit('waiting', { message: 'Waiting for another player...' });
      }
    });

    // ── banCategory ───────────────────────────────────────────
    socket.on('banCategory', ({ category }) => {
      const roomId = playerToRoom[socket.id];
      if (!roomId) return;
      const room = rooms[roomId];
      if (!room) return;

      const { banPick, playerOrder } = room;
      const [p1, p2] = playerOrder; // ✅ FIX: use playerOrder not Object.keys()

      // Validate it's this player's turn
      const expectedTurn = banPick.phase === 'ban1' ? p1 : p2;
      if (socket.id !== expectedTurn) {
        console.log(`Ban rejected — not ${socket.id}'s turn`);
        return;
      }

      banPick.bans.push(category);
      console.log(`${room.players[socket.id].name} banned: ${category}`);

      if (banPick.phase === 'ban1') {
        banPick.phase = 'ban2';
        io.to(roomId).emit('banPickUpdate', { phase: 'ban2', bans: banPick.bans, turn: p2 });
      } else if (banPick.phase === 'ban2') {
        banPick.phase = 'pick';
        io.to(roomId).emit('banPickUpdate', { phase: 'pick', bans: banPick.bans, turn: p1 });
      }
    });

    // ── pickCategory ──────────────────────────────────────────
    socket.on('pickCategory', ({ category }) => {
      const roomId = playerToRoom[socket.id];
      if (!roomId) return;
      const room = rooms[roomId];
      if (!room) return;

      const { banPick, playerOrder } = room;
      const [p1] = playerOrder; // ✅ FIX: use playerOrder

      if (banPick.phase !== 'pick' || socket.id !== p1) {
        console.log(`Pick rejected — not ${socket.id}'s turn or wrong phase`);
        return;
      }

      banPick.pick = category;
      banPick.phase = 'playing';
      room.currentCategory = category;
      room.currentQuestionIndex = 0;
      room.roundAnswers = {};

      console.log(`${room.players[socket.id].name} picked category: ${category}`);

      const firstQuestion = room.questionsForServer[category][0];
      io.to(roomId).emit('categoryStart', {
        category,
        questionIndex: 0,
        total: 3,
        question: {
          _id: firstQuestion._id,
          question: firstQuestion.question,
        },
      });
    });

    // ── submitAnswer ──────────────────────────────────────────
    socket.on('submitAnswer', ({ answer, responseTime }) => {
      const roomId = playerToRoom[socket.id];
      if (!roomId) return;
      const room = rooms[roomId];
      if (!room || !room.gameActive) return;

      const { currentCategory, currentQuestionIndex, questionsForServer, playerOrder } = room;
      const [p1, p2] = playerOrder; // ✅ FIX: use playerOrder
      const currentQuestion = questionsForServer[currentCategory][currentQuestionIndex];

      // Normalize and check answer server-side — answer never leaves server
      const normalize = (str) => str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
      const isCorrect = normalize(answer) === normalize(currentQuestion.answer);

      room.roundAnswers[socket.id] = { answer, isCorrect, responseTime: responseTime || 0 };

      console.log(`${room.players[socket.id].name} answered: "${answer}" — ${isCorrect ? 'correct' : 'wrong'}`);

      // Tell only this player their result privately
      socket.emit('answerAcknowledged', {
        questionId: currentQuestion._id,
        isCorrect,
        correctAnswer: currentQuestion.answer,
      });

      const allAnswered = playerOrder.every((pid) => room.roundAnswers[pid]);

      if (allAnswered) {
        // Build results for both players
        const results = {};
        playerOrder.forEach((pid) => {
          if (room.roundAnswers[pid].isCorrect) room.players[pid].score += 1;
          results[pid] = {
            name:         room.players[pid].name,
            answer:       room.roundAnswers[pid].answer,
            isCorrect:    room.roundAnswers[pid].isCorrect,
            responseTime: room.roundAnswers[pid].responseTime,
            score:        room.players[pid].score,
          };
        });

        room.roundAnswers = {};
        room.currentQuestionIndex += 1;

        const categoryDone = room.currentQuestionIndex >= 3;

        if (!categoryDone) {
          // Next question in same category
          const nextQ = questionsForServer[currentCategory][room.currentQuestionIndex];
          io.to(roomId).emit('roundResults', {
            results,
            nextQuestion: { _id: nextQ._id, question: nextQ.question },
            questionIndex: room.currentQuestionIndex,
            categoryDone: false,
          });
        } else {
          // ✅ FIX: use accumulated categoryScores not just last question's results
          const catScores = room.categoryScores[currentCategory];
          const p1Correct = catScores[p1];
          const p2Correct = catScores[p2];
 
          console.log(`Category scores — ${room.players[p1].name}: ${p1Correct} | ${room.players[p2].name}: ${p2Correct}`);
 
          let categoryWinner;
          if (p1Correct !== p2Correct) {
            categoryWinner = p1Correct > p2Correct ? p1 : p2;
          } else {
            // Tiebreak by total response time across all questions — lower is better
            const p1Time = results[p1].responseTime;
            const p2Time = results[p2].responseTime;
            categoryWinner = p1Time <= p2Time ? p1 : p2;
          }
 
          room.categoryResults[currentCategory] = { winner: categoryWinner };
          console.log(`Category "${currentCategory}" winner: ${room.players[categoryWinner].name}`);
 
          const p1Wins = Object.values(room.categoryResults).filter((r) => r.winner === p1).length;
          const p2Wins = Object.values(room.categoryResults).filter((r) => r.winner === p2).length;
          const matchWinner = p1Wins >= 2 ? p1 : p2Wins >= 2 ? p2 : null;
 
          if (matchWinner) {
            room.gameActive = false;
            console.log(`Match over — winner: ${room.players[matchWinner].name}`);
          }
 
          io.to(roomId).emit('roundResults', {
            results,
            categoryDone: true,
            categoryWinner,
            categoryResults: room.categoryResults,
            matchWinner,
          });
        }
      }
    });
    // ── disconnect ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      const roomId = playerToRoom[socket.id];
      if (roomId && rooms[roomId]) {
        const otherPlayerId = rooms[roomId].playerOrder.find((pid) => pid !== socket.id);
        if (otherPlayerId) {
          io.to(otherPlayerId).emit('opponentDisconnected', { message: 'Opponent disconnected' });
        }
        delete rooms[roomId];
      }

      delete playerToRoom[socket.id];
      const index = waitingPlayers.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) waitingPlayers.splice(index, 1);
    });
  });
};

module.exports = initSocket;