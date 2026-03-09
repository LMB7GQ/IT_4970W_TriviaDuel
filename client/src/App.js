import './App.css';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [gameState, setGameState] = useState('idle'); // idle, waiting, playing, finished
  const [gameMode, setGameMode] = useState(null); // null, ranked, solo

  const [playerName, setPlayerName] = useState('');
  const [playerRank] = useState(1000); // temporary mock rank for solo mode

  const [socket, setSocket] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [roundResults, setRoundResults] = useState(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  //placeholder questions for demo
  const soloQuestions = [
    { question: 'What is the capital of France?', answer: 'Paris' },
    { question: 'What planet is known as the Red Planet?', answer: 'Mars' },
    { question: 'How many sides does a triangle have?', answer: '3' },
    { question: 'Who wrote Hamlet?', answer: 'Shakespeare' },
    { question: 'What is the largest ocean on Earth?', answer: 'Pacific' }
  ];

  const getBotAccuracy = (rank) => {
    if (rank < 900) return 0.4;
    if (rank < 1200) return 0.6;
    if (rank < 1500) return 0.75;
    return 0.85;
  };

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      autoConnect: true
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => {
      setGameState('waiting');
    });

    socket.on('matchFound', (data) => {
      setRoomInfo({ roomId: data.roomId, opponent: data.opponent });
      setCurrentQuestion(data.currentQuestion || null);
      setRoundResults(null);
      setGameState('playing');
    });

    socket.on('roundResults', (data) => {
      setRoundResults(data.results || null);
      setCurrentQuestion(data.nextQuestion || null);

      if (data.gameOver) {
        setGameState('finished');
      } else {
        setGameState('playing');
      }
    });

    socket.on('opponentDisconnected', (data) => {
      alert(data.message || 'Opponent disconnected');
      resetGame();
    });

    return () => {
      socket.off('waiting');
      socket.off('matchFound');
      socket.off('roundResults');
      socket.off('opponentDisconnected');
    };
  }, [socket]);

  const resetGame = () => {
    setGameState('idle');
    setGameMode(null);
    setRoomInfo(null);
    setCurrentQuestion(null);
    setUserAnswer('');
    setRoundResults(null);
    setPlayerScore(0);
    setBotScore(0);
    setQuestionIndex(0);
  };

  const handleJoinRankedGame = () => {
    if (!playerName.trim() || !socket) return;

    setGameMode('ranked');
    setRoundResults(null);
    setPlayerScore(0);
    setBotScore(0);
    socket.emit('joinGame', playerName);
    setGameState('waiting');
  };

  const handleStartSoloGame = () => {
    if (!playerName.trim()) return;

    setGameMode('solo');
    setPlayerScore(0);
    setBotScore(0);
    setQuestionIndex(0);
    setRoundResults(null);
    setRoomInfo({ opponent: 'Bot Knight' });
    setCurrentQuestion(soloQuestions[0]);
    setGameState('playing');
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    if (gameMode === 'ranked') {
      if (socket) {
        socket.emit('submitAnswer', { answer: userAnswer });
        setUserAnswer('');
      }
      return;
    }

    if (gameMode === 'solo') {
      const correctAnswer = currentQuestion.answer.trim().toLowerCase();
      const playerCorrect = userAnswer.trim().toLowerCase() === correctAnswer;

      let newPlayerScore = playerScore;
      let newBotScore = botScore;

      if (playerCorrect) {
        newPlayerScore += 1;
        setPlayerScore(newPlayerScore);
      }

      const botAccuracy = getBotAccuracy(playerRank);
      const botCorrect = Math.random() < botAccuracy;

      if (botCorrect) {
        newBotScore += 1;
        setBotScore(newBotScore);
      }

      setRoundResults({
        player: {
          playerName,
          answered: userAnswer,
          correct: playerCorrect,
          currentScore: newPlayerScore
        },
        bot: {
          playerName: 'Bot Knight',
          answered: botCorrect ? currentQuestion.answer : 'Wrong Answer',
          correct: botCorrect,
          currentScore: newBotScore
        }
      });

      setUserAnswer('');

      const nextIndex = questionIndex + 1;

      if (nextIndex >= soloQuestions.length) {
        setGameState('finished');
      } else {
        setQuestionIndex(nextIndex);

        setTimeout(() => {
          setCurrentQuestion(soloQuestions[nextIndex]);
        }, 1200);
      }
    }
  };

  return (
    <div className="app-container">
      <div className="title-box">⚔ Trivia Duel ⚔</div>

      {gameState === 'idle' && (
        <div className="join-section">
          <h2>Enter the Arena</h2>

          <input
            type="text"
            placeholder="Enter your duelist name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <button onClick={handleStartSoloGame}>Solo Mode</button>
          <button onClick={handleJoinRankedGame}>Ranked Mode</button>

          <p style={{ marginTop: '16px' }}>
            Practice against a bot or challenge another player.
          </p>
        </div>
      )}

      {gameState === 'waiting' && (
        <div className="waiting-screen">
          <div className="loading-dots">
            <div className="dot red"></div>
            <div className="dot yellow"></div>
            <div className="dot blue"></div>
          </div>

          <div className="matchup-line">{playerName} vs ???</div>
          <p>Searching the kingdom for a worthy opponent...</p>
        </div>
      )}

      {gameState === 'playing' && currentQuestion && (
        <div className="game-section">
          <div className="matchup-line">
            {playerName} vs {roomInfo?.opponent || 'Bot Knight'}
          </div>

          <div className="scoreboard">
            <div className="score-card">
              {playerName}
              <br />
              Rank: {playerRank}
              <br />
              Score: {gameMode === 'solo' ? playerScore : '-'}
            </div>

            <div className="score-card">
              {roomInfo?.opponent || 'Bot Knight'}
              <br />
              {gameMode === 'solo' ? 'Adaptive Bot' : 'Online Opponent'}
              <br />
              Score: {gameMode === 'solo' ? botScore : '-'}
            </div>
          </div>

          <div className="question-area">
            <h2>{currentQuestion.question}</h2>

            <input
              type="text"
              placeholder="Type your answer"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            />

            <button onClick={handleSubmitAnswer}>Submit Answer</button>
          </div>

          {roundResults && (
            <div className="results-area">
              <h3>Round Results</h3>
              <ul>
                {Object.entries(roundResults).map(([pid, info]) => (
                  <li key={pid}>
                    {info.playerName}: {info.answered} — {info.correct ? 'Correct' : 'Incorrect'} (Score: {info.currentScore})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {gameState === 'finished' && (
        <div className="game-section">
          <h2>Battle Complete</h2>

          <div className="scoreboard">
            <div className="score-card">
              {playerName}
              <br />
              Final Score: {gameMode === 'solo' ? playerScore : '-'}
            </div>

            <div className="score-card">
              {roomInfo?.opponent || 'Bot Knight'}
              <br />
              Final Score: {gameMode === 'solo' ? botScore : '-'}
            </div>
          </div>

          {roundResults && (
            <div className="results-area">
              <h3>Final Results</h3>
              <ul>
                {Object.entries(roundResults).map(([pid, info]) => (
                  <li key={pid}>
                    {info.playerName}: {info.currentScore}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}

export default App;