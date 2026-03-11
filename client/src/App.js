import './App.css';
import { useState, useEffect, useCallback, useMemo} from 'react';
import { io } from 'socket.io-client';

function App() {
  const [screen, setScreen] = useState('login'); // login, signup, modeSelect, waiting, playing, finished
  const [gameMode, setGameMode] = useState(null); // null, ranked, bot, practice

  const [playerName, setPlayerName] = useState('');
  const [playerRank] = useState(1000); // temporary mock rank

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formMessage, setFormMessage] = useState('');

  const [socket, setSocket] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [roundResults, setRoundResults] = useState(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [timeLeft, setTimeLeft] = useState(15);
  const [botAnswered, setBotAnswered] = useState(false);
  const [botAnswerData, setBotAnswerData] = useState(null);

  // placeholder questions for demo
  const soloQuestions = useMemo(()=>[
    { question: 'What is the capital of France?', answer: 'Paris' },
    { question: 'What planet is known as the Red Planet?', answer: 'Mars' },
    { question: 'How many sides does a triangle have?', answer: '3' },
    { question: 'Who wrote Hamlet?', answer: 'Shakespeare' },
    { question: 'What is the largest ocean on Earth?', answer: 'Pacific' }
  ],[]);

  const getBotAccuracy = (rank) => {
    if (rank < 900) return 0.4;
    if (rank < 1200) return 0.6;
    if (rank < 1500) return 0.75;
    return 0.85;
  };

  const getBotResponseTime = (rank) => {
    if (rank < 900) return 9000;
    if (rank < 1200) return 7000;
    if (rank < 1500) return 5000;
    return 3000;
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
      setScreen('waiting');
    });

    socket.on('matchFound', (data) => {
      setRoomInfo({ roomId: data.roomId, opponent: data.opponent });
      setCurrentQuestion(data.currentQuestion || null);
      setRoundResults(null);
      setScreen('playing');
    });

    socket.on('roundResults', (data) => {
      setRoundResults(data.results || null);
      setCurrentQuestion(data.nextQuestion || null);

      if (data.gameOver) {
        setScreen('finished');
      } else {
        setScreen('playing');
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
    setScreen('modeSelect');
    setGameMode(null);
    setRoomInfo(null);
    setCurrentQuestion(null);
    setUserAnswer('');
    setRoundResults(null);
    setPlayerScore(0);
    setBotScore(0);
    setQuestionIndex(0);
    setTimeLeft(15);
    setBotAnswered(false);
    setBotAnswerData(null);
    setFormMessage('');
  };

  const handleLogin = () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setFormMessage('Please enter both username and password.');
      return;
    }

    // front-end only demo login for now
    setPlayerName(loginUsername.trim());
    setFormMessage('');
    setScreen('modeSelect');
  };

  const handleCreateAccount = () => {
    if (
      !signupUsername.trim() ||
      !signupPassword.trim() ||
      !confirmPassword.trim()
    ) {
      setFormMessage('Please fill out all fields.');
      return;
    }

    if (signupPassword !== confirmPassword) {
      setFormMessage('Passwords do not match.');
      return;
    }

    // front-end only demo signup for now
    setPlayerName(signupUsername.trim());
    setFormMessage('');
    setScreen('modeSelect');
  };

  const handleJoinRankedGame = () => {
    if (!playerName.trim() || !socket) return;

    setGameMode('ranked');
    setRoundResults(null);
    setPlayerScore(0);
    setBotScore(0);
    socket.emit('joinGame', playerName);
    setScreen('waiting');
  };

  const handleStartBotGame = () => {
    if (!playerName.trim()) return;

    setGameMode('bot');
    setPlayerScore(0);
    setBotScore(0);
    setQuestionIndex(0);
    setRoundResults(null);
    setRoomInfo({ opponent: 'Bot Knight' });
    setCurrentQuestion(soloQuestions[0]);
    setTimeLeft(15);
    setBotAnswered(false);
    setBotAnswerData(null);
    setScreen('playing');
  };

  const handleStartPracticeGame = () => {
    if (!playerName.trim()) return;

    setGameMode('practice');
    setPlayerScore(0);
    setBotScore(0);
    setQuestionIndex(0);
    setRoundResults(null);
    setRoomInfo(null);
    setCurrentQuestion(soloQuestions[0]);
    setTimeLeft(15);
    setBotAnswered(false);
    setBotAnswerData(null);
    setScreen('playing');
  };

  const handleSubmitAnswer = useCallback((timeExpired = false) => {
    if (!timeExpired && !userAnswer.trim()) return;

    if (gameMode === 'ranked') {
      if (socket) {
        socket.emit('submitAnswer', { answer: userAnswer });
        setUserAnswer('');
      }
      return;
    }

    if (gameMode === 'practice') {
      const submittedAnswer = timeExpired ? '' : userAnswer;
      const correctAnswer = currentQuestion.answer.trim().toLowerCase();
      const playerCorrect = submittedAnswer.trim().toLowerCase() === correctAnswer;

      let newPlayerScore = playerScore;

      if (playerCorrect) {
        newPlayerScore += 1;
        setPlayerScore(newPlayerScore);
      }

      setRoundResults({
        player: {
          playerName,
          answered: submittedAnswer || 'No Answer',
          correct: playerCorrect,
          currentScore: newPlayerScore
        }
      });

      setUserAnswer('');

      const nextIndex = questionIndex + 1;

      if (nextIndex >= soloQuestions.length) {
        setScreen('finished');
      } else {
        setQuestionIndex(nextIndex);
        setTimeLeft(15);
        setTimeout(() => {
          setCurrentQuestion(soloQuestions[nextIndex]);
        }, 1200);
      }

      return;
    }

    if (gameMode === 'bot') {
      const submittedAnswer = timeExpired ? '' : userAnswer;
      const correctAnswer = currentQuestion.answer.trim().toLowerCase();
      const playerCorrect = submittedAnswer.trim().toLowerCase() === correctAnswer;

      let newPlayerScore = playerScore;
      let newBotScore = botScore;

      if (playerCorrect) {
        newPlayerScore += 1;
        setPlayerScore(newPlayerScore);
      }

      const finalBotAnswered = botAnswerData?.answered || 'No Answer';
      const finalBotCorrect = botAnswerData?.correct || false;

      if (finalBotCorrect) {
        newBotScore += 1;
        setBotScore(newBotScore);
      }

      setRoundResults({
        player: {
          playerName,
          answered: submittedAnswer || 'No Answer',
          correct: playerCorrect,
          currentScore: newPlayerScore
        },
        bot: {
          playerName: 'Bot Knight',
          answered: finalBotAnswered,
          correct: finalBotCorrect,
          currentScore: newBotScore
        }
      });

      setUserAnswer('');

      const nextIndex = questionIndex + 1;

      if (nextIndex >= soloQuestions.length) {
        setScreen('finished');
      } else {
        setQuestionIndex(nextIndex);
        setTimeLeft(15);
        setBotAnswered(false);
        setBotAnswerData(null);

        setTimeout(() => {
          setCurrentQuestion(soloQuestions[nextIndex]);
        }, 1200);
      }

      return;
    }
  }, [
    gameMode,
    userAnswer,
    socket,
    currentQuestion,
    playerScore,
    botScore,
    botAnswerData,
    questionIndex,
    playerName,
    soloQuestions
  ]);
  
  // timer for practice and bot only
  useEffect(() => {
    if (screen !== 'playing' || !currentQuestion) return;
    if (gameMode === 'ranked') return;

    if (timeLeft <= 0) {
      handleSubmitAnswer(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [screen, currentQuestion, timeLeft, gameMode, handleSubmitAnswer]);

  // bot auto-answer
  useEffect(() => {
    if (screen !== 'playing' || gameMode !== 'bot' || !currentQuestion) return;

    setBotAnswered(false);
    setBotAnswerData(null);

    const botAccuracy = getBotAccuracy(playerRank);
    const responseTime = getBotResponseTime(playerRank);

    const botTimer = setTimeout(() => {
      const correct = Math.random() < botAccuracy;

      setBotAnswered(true);
      setBotAnswerData({
        answered: correct ? currentQuestion.answer : 'Wrong Answer',
        correct
      });
    }, responseTime);

    return () => clearTimeout(botTimer);
  }, [screen, gameMode, currentQuestion, playerRank]);

  return (
    <div className="app-container">
      <div className="title-box">Trivia Duel</div>

      {screen === 'login' && (
        <div className="join-section">
          <h2>Login</h2>

          <input
            type="text"
            placeholder="Username"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />

          <button onClick={handleLogin}>Login</button>
          <button
            onClick={() => {
              setFormMessage('');
              setScreen('signup');
            }}
          >
            Create Account
          </button>

          {formMessage && <p className="form-message">{formMessage}</p>}
        </div>
      )}

      {screen === 'signup' && (
        <div className="join-section">
          <h2>Create Account</h2>

          <input
            type="text"
            placeholder="Username"
            value={signupUsername}
            onChange={(e) => setSignupUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button onClick={handleCreateAccount}>Create Account</button>
          <button
            onClick={() => {
              setFormMessage('');
              setScreen('login');
            }}
          >
            Back to Login
          </button>

          {formMessage && <p className="form-message">{formMessage}</p>}
        </div>
      )}

      {screen === 'modeSelect' && (
        <div className="join-section">
          <h2>Welcome, {playerName}</h2>
          <p>Choose your duel mode.</p>

          <button onClick={handleStartPracticeGame}>Solo Practice Mode</button>
          <button onClick={handleStartBotGame}>Bot Duel</button>
          <button onClick={handleJoinRankedGame}>Ranked Mode</button>

          <button
            onClick={() => {
              setFormMessage('');
              setScreen('login');
            }}
          >
            Log Out
          </button>
        </div>
      )}

      {screen === 'waiting' && (
        <div className="waiting-screen">
          <div className="loading-dots">
            <div className="dot red"></div>
            <div className="dot yellow"></div>
            <div className="dot blue"></div>
          </div>

          <div className="matchup-line">{playerName} vs ???</div>
          <p>Searching for an opponent...</p>
        </div>
      )}

      {screen === 'playing' && currentQuestion && (
        <div className="game-section">
          <div className="matchup-line">
            {gameMode === 'practice'
              ? `${playerName} Practice Mode`
              : `${playerName} vs ${roomInfo?.opponent || 'Bot Knight'}`}
          </div>

          {gameMode !== 'ranked' && (
            <div className="timer-box">Time Left: {timeLeft}s</div>
          )}

          <div className="scoreboard">
            <div className="score-card">
              {playerName}
              <br />
              Rank: {playerRank}
              <br />
              Score: {playerScore}
            </div>

            {gameMode !== 'practice' && (
              <div className="score-card">
                {roomInfo?.opponent || 'Bot Knight'}
                <br />
                {gameMode === 'bot' ? 'Adaptive Bot' : 'Online Opponent'}
                <br />
                Score: {gameMode === 'bot' ? botScore : '-'}
              </div>
            )}
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

            <button onClick={() => handleSubmitAnswer()}>Submit Answer</button>
          </div>

          {gameMode === 'bot' && (
            <p className="bot-status">
              {botAnswered ? 'Bot Knight has answered.' : 'Bot Knight is thinking...'}
            </p>
          )}

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

      {screen === 'finished' && (
        <div className="game-section">
          <h2>Battle Complete</h2>

          <div className="scoreboard">
            <div className="score-card">
              {playerName}
              <br />
              Final Score: {playerScore}
            </div>

            {gameMode !== 'practice' && (
              <div className="score-card">
                {roomInfo?.opponent || 'Bot Knight'}
                <br />
                Final Score: {gameMode === 'bot' ? botScore : '-'}
              </div>
            )}
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
