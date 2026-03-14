import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('login'); // login, signup, modeSelect, waiting, banPick, playing, finished
  const [gameMode, setGameMode] = useState(null);

  const [playerName, setPlayerName] = useState('');
  const [playerRank] = useState(1000);

  const [roomInfo, setRoomInfo] = useState(null);
  const [banPick, setBanPick] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [roundResults, setRoundResults] = useState(null);
  const [myResult, setMyResult] = useState(null);

  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  const [botAnswered, setBotAnswered] = useState(false);
  const [botAnswerData, setBotAnswerData] = useState(null);

  // Reverting to hardcoded questions for solo/bot demo
  const soloQuestions = useMemo(() => [
    { _id: 'mock1', question: 'What is the capital of France?', answer: 'Paris' },
    { _id: 'mock2', question: 'What planet is known as the Red Planet?', answer: 'Mars' },
    { _id: 'mock3', question: 'How many sides does a triangle have?', answer: '3' },
    { _id: 'mock4', question: 'Who wrote Hamlet?', answer: 'Shakespeare' },
    { _id: 'mock5', question: 'What is the largest ocean on Earth?', answer: 'Pacific' }
  ], []);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const resetGame = useCallback(() => {
    setScreen('modeSelect');
    setGameMode(null);
    setRoomInfo(null);
    setBanPick(null);
    setCurrentQuestion(null);
    setUserAnswer('');
    setRoundResults(null);
    setMyResult(null);
    setPlayerScore(0);
    setOpponentScore(0);
    setQuestionIndex(0);
    setTimeLeft(15);
    setBotAnswered(false);
    setBotAnswerData(null);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => setScreen('waiting'));

    socket.on('matchReady', (data) => {
      setRoomInfo({
        roomId: data.roomId,
        myId: data.myId,
        opponent: data.opponent,
        categories: data.categories
      });
      setBanPick(data.banPick);
      setScreen('banPick');
    });

    socket.on('banPickUpdate', (data) => {
      setBanPick((prev) => ({ ...prev, ...data }));
    });

    socket.on('categoryStart', (data) => {
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setRoundResults(null);
      setMyResult(null);
      setScreen('playing');
      setTimeLeft(15);
    });

    socket.on('answerAcknowledged', (data) => setMyResult(data));

    socket.on('roundResults', (data) => {
      setRoundResults(data.results);
      setMyResult(null);

      if (roomInfo?.myId && data.results[roomInfo.myId]) {
        setPlayerScore(data.results[roomInfo.myId].score);
      }
      const oppId = roomInfo?.myId && Object.keys(data.results).find(id => id !== roomInfo.myId);
      if (oppId) {
        setOpponentScore(data.results[oppId].score);
      }

      if (data.matchWinner) {
        setTimeout(() => setScreen('finished'), 2000);
      } else if (!data.categoryDone) {
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setQuestionIndex(data.questionIndex);
          setRoundResults(null);
          setTimeLeft(15);
        }, 2000);
      }
    });

    socket.on('opponentDisconnected', (data) => {
      alert(data.message || 'Opponent disconnected');
      resetGame();
    });

    return () => {
      socket.off('waiting');
      socket.off('matchReady');
      socket.off('banPickUpdate');
      socket.off('categoryStart');
      socket.off('answerAcknowledged');
      socket.off('roundResults');
      socket.off('opponentDisconnected');
    };
  }, [socket, roomInfo, resetGame]);

  const handleSubmitAnswer = useCallback((timeExpired = false) => {
    if (!timeExpired && !userAnswer.trim() && !myResult) return;
    if (myResult) return; 

    if (gameMode === 'ranked') {
      if (socket) {
        socket.emit('submitAnswer', { answer: userAnswer, responseTime: 15 - timeLeft });
        setUserAnswer('');
      }
      return;
    }

    // Bot / Practice Logic (Local)
    const submittedAnswer = timeExpired ? '' : userAnswer;
    const currentQ = soloQuestions[questionIndex];
    const isCorrect = submittedAnswer.trim().toLowerCase() === currentQ.answer.toLowerCase();

    let newPlayerScore = playerScore;
    let newOpponentScore = opponentScore;

    if (isCorrect) newPlayerScore += 1;
    setPlayerScore(newPlayerScore);

    let results = {
      player: {
        playerName,
        answered: submittedAnswer || 'No Answer',
        correct: isCorrect,
        currentScore: newPlayerScore
      }
    };

    if (gameMode === 'bot') {
      const finalBotAnswered = botAnswerData?.answered || 'No Answer';
      const finalBotCorrect = botAnswerData?.correct || false;
      if (finalBotCorrect) newOpponentScore += 1;
      setOpponentScore(newOpponentScore);

      results.bot = {
        playerName: 'Bot Knight',
        answered: finalBotAnswered,
        correct: finalBotCorrect,
        currentScore: newOpponentScore
      };
    }

    setRoundResults(results);
    setMyResult({ isCorrect, correctAnswer: currentQ.answer });
    setUserAnswer('');

    const nextIndex = questionIndex + 1;
    if (nextIndex >= soloQuestions.length) {
      setTimeout(() => setScreen('finished'), 2000);
    } else {
      setTimeout(() => {
        setQuestionIndex(nextIndex);
        setCurrentQuestion(soloQuestions[nextIndex]);
        setTimeLeft(15);
        setBotAnswered(false);
        setBotAnswerData(null);
        setRoundResults(null);
        setMyResult(null);
      }, 2000);
    }
  }, [gameMode, userAnswer, socket, questionIndex, playerScore, opponentScore, botAnswerData, playerName, soloQuestions, timeLeft, myResult]);

  // Timer logic for Bot/Practice
  useEffect(() => {
    if (screen !== 'playing' || !currentQuestion) return;
    if (gameMode === 'ranked') return;

    if (timeLeft <= 0) {
      handleSubmitAnswer(true);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [screen, currentQuestion, timeLeft, gameMode, handleSubmitAnswer]);

  // Bot logic
  useEffect(() => {
    if (screen !== 'playing' || gameMode !== 'bot' || !currentQuestion) return;

    setBotAnswered(false);
    setBotAnswerData(null);

    const botAccuracy = ((rank) => {
      if (rank < 900) return 0.4;
      if (rank < 1200) return 0.6;
      if (rank < 1500) return 0.75;
      return 0.85;
    })(playerRank);

    const responseTime = ((rank) => {
      if (rank < 900) return 9000;
      if (rank < 1200) return 7000;
      if (rank < 1500) return 5000;
      return 3000;
    })(playerRank);

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

  const joinRanked = useCallback(() => {
    if (!playerName.trim() || !socket) return;
    setGameMode('ranked');
    socket.emit('joinGame', { playerName, rank: playerRank });
    setScreen('waiting');
  }, [playerName, socket, playerRank]);

  const startBotGame = useCallback(() => {
    setGameMode('bot');
    setRoomInfo({ opponent: { name: 'Bot Knight' } });
    setCurrentQuestion(soloQuestions[0]);
    setScreen('playing');
  }, [soloQuestions]);

  const startPractice = useCallback(() => {
    setGameMode('practice');
    setRoomInfo(null);
    setCurrentQuestion(soloQuestions[0]);
    setScreen('playing');
  }, [soloQuestions]);

  const value = {
    socket, screen, setScreen,
    gameMode, setGameMode,
    playerName, setPlayerName,
    playerRank, roomInfo, banPick,
    currentQuestion, userAnswer, setUserAnswer,
    roundResults, myResult,
    playerScore, opponentScore,
    questionIndex, timeLeft, setTimeLeft,
    botAnswered, setBotAnswered, botAnswerData, setBotAnswerData,
    resetGame, joinRanked, startBotGame, startPractice,
    handleSubmitAnswer,
    soloQuestions
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
