const { getRandomCategories, fetchMatchQuestions } = require('../scripts/matchUtils');

// ── In-memory state ─────────────────────────────────────────────
const waitingPlayers  = [];
const rooms           = {};
const playerToRoom    = {};
const connectedUsers  = {}; // username → socketId (for invite lookup)
const pendingInvites  = {}; // inviteId → { from, to, timer }

// ── Helpers ──────────────────────────────────────────────────────
const generateInviteId = () => `invite_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const createRoom = async (io, player1, player2) => {
  const roomId    = `room_${Date.now()}`;
  const categories = getRandomCategories(5);
  const { questionsForClient, questionsForServer } = await fetchMatchQuestions(categories);

  rooms[roomId] = {
    roomId,
    categories,
    playerOrder: [player1.socketId, player2.socketId],
    players: {
      [player1.socketId]: { id: player1.socketId, name: player1.name, rank: player1.rank, score: 0 },
      [player2.socketId]: { id: player2.socketId, name: player2.name, rank: player2.rank, score: 0 },
    },
    questionsForServer,
    banPick: {
      bans:  [],
      pick:  null,
      phase: 'ban1',
    },
    categoryResults:  {},
    categoryScores:   {},
    currentCategory:  null,
    currentQuestionIndex: 0,
    roundAnswers:     {},
    gameActive:       true,
    chat:             [], // lobby + in-match chat history (ephemeral)
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
    banPick: { phase: 'ban1', turn: player1.socketId, bans: [], pick: null },
  });

  io.to(player1.socketId).emit('matchReady', matchPayload(player1.socketId, player2.name, player2.rank));
  io.to(player2.socketId).emit('matchReady', matchPayload(player2.socketId, player1.name, player1.rank));

  console.log(`Room created: ${roomId} | Categories: ${categories.join(', ')}`);
  return roomId;
};

// ── Socket init ──────────────────────────────────────────────────
const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ── Register user in connectedUsers on connect ────────────
    // If the socket has an authenticated user, map username → socketId
    if (socket.data.user) {
      connectedUsers[socket.data.user.username] = socket.id;
      console.log(`Authenticated user connected: ${socket.data.user.username}`);
    }

    // ── joinGame ──────────────────────────────────────────────
    socket.on('joinGame', async ({ playerName, rank = 500 }) => {
      // Use authenticated username if available, fall back to provided name
      const name = socket.data.user?.username || playerName;
      const playerRank = socket.data.user?.rank || rank;

      console.log(`${name} (rank: ${playerRank}) is joining...`);

      // Remove if already in waiting list
      const existingIndex = waitingPlayers.findIndex(p => p.socketId === socket.id);
      if (existingIndex !== -1) waitingPlayers.splice(existingIndex, 1);

      waitingPlayers.push({ socketId: socket.id, name, rank: playerRank });

      if (waitingPlayers.length >= 2) {
        const player1 = waitingPlayers.shift();
        const player2 = waitingPlayers.shift();
        await createRoom(io, player1, player2);
      } else {
        socket.emit('waiting', { message: 'Waiting for another player...' });
      }
    });

    // ── leaveMatchup ──────────────────────────────────────────
    socket.on('leaveMatchup', () => {
      console.log(`User ${socket.id} left the queue.`);
      const index = waitingPlayers.findIndex((p) => p.socketId === socket.id);
      if (index !== -1) {
        waitingPlayers.splice(index, 1);
        console.log('Player removed from waiting list.');
      }
    });

    // ── sendInvite ────────────────────────────────────────────
    // Logged in user invites another user by username
    socket.on('sendInvite', ({ toUsername }) => {
      // Must be logged in to send invites
      if (!socket.data.user) {
        return socket.emit('inviteError', { message: 'You must be logged in to send invites' });
      }

      const fromUsername = socket.data.user.username;

      // Can't invite yourself
      if (toUsername.toLowerCase() === fromUsername.toLowerCase()) {
        return socket.emit('inviteError', { message: 'You cannot invite yourself' });
      }

      // Look up target player's socket
      const toSocketId = connectedUsers[toUsername.toLowerCase()];
      if (!toSocketId) {
        return socket.emit('inviteError', { message: `${toUsername} is not online` });
      }

      const inviteId = generateInviteId();

      // Send invite to target player
      io.to(toSocketId).emit('inviteReceived', {
        inviteId,
        fromUsername,
        fromSocketId: socket.id,
        message: `${fromUsername} has invited you to a match!`,
      });

      // Confirm to sender
      socket.emit('inviteSent', {
        inviteId,
        toUsername,
        message: `Invite sent to ${toUsername}. Waiting for response...`,
      });

      console.log(`Invite sent: ${fromUsername} → ${toUsername} (${inviteId})`);

      // ── 30 second timeout ─────────────────────────────────
      const timer = setTimeout(() => {
        if (pendingInvites[inviteId]) {
          delete pendingInvites[inviteId];
          socket.emit('inviteExpired', { inviteId, message: `${toUsername} did not respond in time` });
          io.to(toSocketId).emit('inviteExpired', { inviteId, message: `Invite from ${fromUsername} expired` });
          console.log(`Invite expired: ${inviteId}`);
        }
      }, 30000);

      pendingInvites[inviteId] = {
        fromSocketId: socket.id,
        fromUsername,
        toSocketId,
        toUsername,
        timer,
      };
    });

    // ── acceptInvite ──────────────────────────────────────────
    socket.on('acceptInvite', async ({ inviteId }) => {
      const invite = pendingInvites[inviteId];
      if (!invite) {
        return socket.emit('inviteError', { message: 'Invite no longer valid' });
      }

      // Cancel timeout
      clearTimeout(invite.timer);
      delete pendingInvites[inviteId];

      const fromSocket = io.sockets.sockets.get(invite.fromSocketId);
      if (!fromSocket) {
        return socket.emit('inviteError', { message: 'That player is no longer online' });
      }

      // Build player objects and create room directly — bypass queue
      const player1 = {
        socketId: invite.fromSocketId,
        name:     invite.fromUsername,
        rank:     fromSocket.data.user?.rank || 1000,
      };
      const player2 = {
        socketId: socket.id,
        name:     socket.data.user?.username || invite.toUsername,
        rank:     socket.data.user?.rank || 1000,
      };

      console.log(`Invite accepted: ${player2.name} accepted ${player1.name}'s invite`);
      await createRoom(io, player1, player2);
    });

    // ── declineInvite ─────────────────────────────────────────
    socket.on('declineInvite', ({ inviteId }) => {
      const invite = pendingInvites[inviteId];
      if (!invite) return;

      clearTimeout(invite.timer);
      delete pendingInvites[inviteId];

      const declinerName = socket.data.user?.username || 'Player';

      io.to(invite.fromSocketId).emit('inviteDeclined', {
        inviteId,
        message: `${declinerName} declined your invite`,
      });

      console.log(`Invite declined: ${inviteId}`);
    });

    // ── sendMessage ───────────────────────────────────────────
    // Works in lobby and in-match — same roomId covers both
    socket.on('sendMessage', ({ roomId, message }) => {
      if (!roomId || !message) return;

      const room = rooms[roomId];
      if (!room) return;

      // Only players in this room can chat
      if (playerToRoom[socket.id] !== roomId) return;

      // Sanitize — strip HTML, limit length
      const clean = message.toString().replace(/<[^>]*>/g, '').trim().slice(0, 200);
      if (!clean) return;

      const sender = socket.data.user?.username || room.players[socket.id]?.name || 'Player';

      const chatMessage = {
        from:      sender,
        message:   clean,
        timestamp: new Date().toISOString(),
      };

      // Store in room chat history (ephemeral — cleared when room closes)
      room.chat.push(chatMessage);

      // Broadcast to everyone in the room including sender
      io.to(roomId).emit('newMessage', chatMessage);
    });

    // ── banCategory ───────────────────────────────────────────
    socket.on('banCategory', ({ category }) => {
      const roomId = playerToRoom[socket.id];
      if (!roomId) return;
      const room = rooms[roomId];
      if (!room) return;

      const { banPick, playerOrder } = room;
      const [p1, p2] = playerOrder;

      const expectedTurn = banPick.phase === 'ban1' ? p1 : p2;
      if (socket.id !== expectedTurn) {
        console.log(`Ban rejected — not ${socket.id}'s turn`);
        return;
      }

      banPick.bans.push(category);
      console.log(`${room.players[socket.id].name} banned: ${category}`);

      if (banPick.phase === 'ban1') {
        banPick.phase = 'ban2';
        io.to(roomId).emit('banPickUpdate', { phase: 'ban2', bans: banPick.bans, pick: banPick.pick, turn: p2 });
      } else if (banPick.phase === 'ban2') {
        banPick.phase = 'pick';
        io.to(roomId).emit('banPickUpdate', { phase: 'pick', bans: banPick.bans, pick: banPick.pick, turn: p1 });
      }
    });

    // ── pickCategory ──────────────────────────────────────────
    socket.on('pickCategory', ({ category }) => {
      const roomId = playerToRoom[socket.id];
      if (!roomId) return;
      const room = rooms[roomId];
      if (!room) return;

      const { banPick, playerOrder } = room;
      const [p1, p2] = playerOrder;

      if (banPick.phase !== 'pick' || socket.id !== p1) {
        console.log(`Pick rejected — not ${socket.id}'s turn or wrong phase`);
        return;
      }

      banPick.pick     = category;
      banPick.phase    = 'playing';
      room.currentCategory      = category;
      room.categoryScores[category] = { [p1]: 0, [p2]: 0 };
      room.currentQuestionIndex = 0;
      room.roundAnswers         = {};

      console.log(`${room.players[socket.id].name} picked category: ${category}`);

      const firstQuestion = room.questionsForServer[category][0];
      io.to(roomId).emit('categoryStart', {
        category,
        questionIndex: 0,
        total: 3,
        question: { _id: firstQuestion._id, question: firstQuestion.question },
      });
    });

    // ── submitAnswer ──────────────────────────────────────────
    socket.on('submitAnswer', ({ answer, responseTime }) => {
      const roomId = playerToRoom[socket.id];
      if (!roomId) return;
      const room = rooms[roomId];
      if (!room || !room.gameActive) return;

      const { currentCategory, currentQuestionIndex, questionsForServer, playerOrder } = room;
      if (!currentCategory || currentQuestionIndex >= questionsForServer[currentCategory]?.length) return;

      const [p1, p2]      = playerOrder;
      const currentQuestion = questionsForServer[currentCategory][currentQuestionIndex];
      if (!currentQuestion) return;

      const normalize  = (str) => str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
      const isCorrect  = normalize(answer) === normalize(currentQuestion.answer);

      room.roundAnswers[socket.id] = { answer, isCorrect, responseTime: responseTime || 0 };

      console.log(`${room.players[socket.id].name} answered: "${answer}" — ${isCorrect ? 'correct' : 'wrong'}`);

      socket.emit('answerAcknowledged', {
        questionId:    currentQuestion._id,
        isCorrect,
        correctAnswer: currentQuestion.answer,
      });

      const allAnswered = playerOrder.every((pid) => room.roundAnswers[pid]);

      if (allAnswered) {
        const results = {};
        playerOrder.forEach((pid) => {
          if (room.roundAnswers[pid].isCorrect) {
            room.players[pid].score += 1;
            room.categoryScores[currentCategory][pid] += 1;
          }
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
          const nextQ = questionsForServer[currentCategory][room.currentQuestionIndex];
          io.to(roomId).emit('roundResults', {
            results,
            nextQuestion: { _id: nextQ._id, question: nextQ.question },
            questionIndex: room.currentQuestionIndex,
            categoryDone: false,
          });
        } else {
          const catScores  = room.categoryScores[currentCategory];
          const p1Correct  = catScores[p1];
          const p2Correct  = catScores[p2];

          console.log(`Category scores — ${room.players[p1].name}: ${p1Correct} | ${room.players[p2].name}: ${p2Correct}`);

          let categoryWinner;
          if (p1Correct !== p2Correct) {
            categoryWinner = p1Correct > p2Correct ? p1 : p2;
          } else {
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
          } else {
            // Match continues - reset ban/pick for next round
            room.banPick = {
              bans: [],
              pick: null,
              phase: 'ban1',
              turn: playerOrder[0], // Start with player1 again
            };
            room.currentCategory = null;
            room.currentQuestionIndex = 0;
            room.roundAnswers = {};
            console.log('Match continues - resetting ban/pick phase');
          }

          io.to(roomId).emit('roundResults', {
            results,
            categoryDone:    true,
            categoryWinner,
            categoryResults: room.categoryResults,
            matchWinner,
            banPick: matchWinner ? undefined : room.banPick, // Send banPick state if match continues
          });
        }
      }
    });

    // ── disconnect ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove from connectedUsers
      if (socket.data.user) {
        delete connectedUsers[socket.data.user.username];
      }

      // Cancel any pending invites from or to this socket
      Object.entries(pendingInvites).forEach(([inviteId, invite]) => {
        if (invite.fromSocketId === socket.id || invite.toSocketId === socket.id) {
          clearTimeout(invite.timer);
          const otherSocketId = invite.fromSocketId === socket.id
            ? invite.toSocketId
            : invite.fromSocketId;
          io.to(otherSocketId).emit('inviteExpired', {
            inviteId,
            message: 'Invite cancelled — player disconnected',
          });
          delete pendingInvites[inviteId];
        }
      });

      // Handle room cleanup
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