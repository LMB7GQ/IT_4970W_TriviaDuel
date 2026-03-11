import './App.css';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [gameState, setGameState] = useState('idle'); // idle, waiting, playing, finished
  const [playerName, setPlayerName] = useState('');
  const [socket, setSocket] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [roundResults, setRoundResults] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', (data) => {
      setGameState('waiting');
    });

    socket.on('matchFound', (data) => {
      setRoomInfo({ roomId: data.roomId, opponent: data.opponent });
      setCurrentQuestion(data.currentQuestion || null);
      setGameState('playing');
      setRoundResults(null);
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
      setGameState('idle');
      setRoomInfo(null);
      setCurrentQuestion(null);
      setRoundResults(null);
    });

    return () => {
      socket.off('waiting');
      socket.off('matchFound');
      socket.off('roundResults');
      socket.off('opponentDisconnected');
    };
  }, [socket]);

  const handleJoinGame = () => {
    if (playerName.trim() && socket) {
      socket.emit('joinGame', playerName);
      setGameState('waiting');
    }
  };

  const handleSubmitAnswer = () => {
    if (socket && userAnswer.trim()) {
      socket.emit('submitAnswer', { answer: userAnswer });
      setUserAnswer('');
    }
  };

  return (
    <div className="App">
      <h1>Trivia Duel</h1>

      {gameState === 'idle' && (
        <div className="join-section">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={handleJoinGame}>Join Game</button>
        </div>
      )}

      {gameState === 'waiting' && (
        <div className="join-section">
          <p>Waiting for another player to join...</p>
        </div>
      )}

      {gameState === 'playing' && currentQuestion && (
        <div className="game-section">
          <div className="question-area">
            <h2>{currentQuestion.question}</h2>
            <input
              type="text"
              placeholder="Type your answer"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            />
            <button onClick={handleSubmitAnswer}>Submit Answer</button>
          </div>

          {roundResults && (
            <div className="results-area">
              <h3>Round Results</h3>
              <ul>
                {Object.entries(roundResults).map(([pid, info]) => (
                  <li key={pid}>{info.playerName}: {info.answered} — {info.correct ? 'Correct' : 'Incorrect'} (Score: {info.currentScore})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {gameState === 'finished' && (
        <div className="game-section">
          <h2>Game Over</h2>
          {roundResults && (
            <div>
              <h3>Final Scores</h3>
              <ul>
                {Object.entries(roundResults).map(([pid, info]) => (
                  <li key={pid}>{info.playerName}: {info.currentScore}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
    </div>
  );
}

export default App;
