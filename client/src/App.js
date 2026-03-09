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
    //const newSocket = io('http://localhost:5000');
    //setSocket(newSocket);

    //return () => {
      //newSocket.disconnect();
    //};
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
    <div className="app-container">
      <div className = "title-box">
      <h1>Trivia Duel</h1>
      </div>

      {gameState === 'idle' && (
  <div className="mode-container">

    <div className="mode-card">
      <button className="mode-btn" onClick={handleJoinGame}>
        Ranked Duel
      </button>

      <p>
        Compete against another player in real-time trivia combat.
      </p>

      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />

    </div>

  </div>
)}

{gameState === 'waiting' && (
  <div className="waiting-screen">

    <div className="loading-dots">
      <div className="dot red"></div>
      <div className="dot yellow"></div>
      <div className="dot blue"></div>
    </div>

    <p>Searching for an opponent...</p>

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
