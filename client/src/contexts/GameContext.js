import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    console.log('[Socket] Initialized connection to http://localhost:5000');
    return () => newSocket.disconnect();
  }, []);

  const fetchNextSoloQuestion = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`[Solo] Fetching next question (Rank: ${playerRank})...`);
      const response = await fetch(`http://localhost:5000/api/questions/random?rank=${playerRank}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      console.log('[Solo] Fetched Question:', data._id, data.question);
      setCurrentQuestion(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error("[Solo] Fetch error:", err);
      setLoading(false);
      return null;
    }
  }, [playerRank]);

  const resetGame = useCallback(() => {
    console.log('[Game] Resetting game state');
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
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => {
      console.log('[Socket] Event: waiting');
      setScreen('waiting');
    });

    socket.on('matchReady', (data) => {
      console.log('[Socket] Event: matchReady', data);
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
      console.log('[Socket] Event: banPickUpdate', data);
      setBanPick((prev) => ({ ...prev, ...data }));
    });

    socket.on('categoryStart', (data) => {
      console.log('[Socket] Event: categoryStart', data);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setRoundResults(null);
      setMyResult(null);
      setScreen('playing');
      setTimeLeft(15);
    });

    socket.on('answerAcknowledged', (data) => {
      console.log('[Socket] Event: answerAcknowledged', data);
      setMyResult(data);
    });

    socket.on('roundResults', (data) => {
      console.log('[Socket] Event: roundResults', data);
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
        console.log('[Socket] Match Over. Winner:', data.matchWinner);
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
      console.log('[Socket] Event: opponentDisconnected', data);
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

  const handleSubmitAnswer = useCallback(async (timeExpired = false) => {
    const submittedAnswer = timeExpired ? '' : userAnswer;
    console.log(`[Game] Submitting answer: "${submittedAnswer}" (Mode: ${gameMode})`);

    if (!timeExpired && !userAnswer.trim() && !myResult) return;
    if (myResult) return; 

    if (gameMode === 'ranked') {
      if (socket) {
        socket.emit('submitAnswer', { answer: userAnswer, responseTime: 15 - timeLeft });
        setUserAnswer('');
      }
      return;
    }

    // Bot / Practice Logic (Server-Validated)
    let isCorrect = false;
    let correctAnswer = '';
    try {
      console.log(`[Solo] Validating answer for question ${currentQuestion._id}...`);
      const resp = await fetch(`http://localhost:5000/api/questions/${currentQuestion._id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAnswer: submittedAnswer })
      });
      const checkData = await resp.json();
      isCorrect = checkData.correct;
      correctAnswer = checkData.correctAnswer;
      console.log(`[Solo] Result: ${isCorrect ? 'CORRECT' : 'WRONG'}. Correct: "${correctAnswer}"`);
    } catch (err) {
      console.error("[Solo] Answer check error:", err);
    }

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
    setMyResult({ isCorrect, correctAnswer });
    setUserAnswer('');

    const nextIndex = questionIndex + 1;
    if (nextIndex >= 5) {
      console.log('[Solo] Session Complete');
      setTimeout(() => setScreen('finished'), 2000);
    } else {
      setTimeout(async () => {
        setQuestionIndex(nextIndex);
        await fetchNextSoloQuestion();
        setTimeLeft(15);
        setBotAnswered(false);
        setBotAnswerData(null);
        setRoundResults(null);
        setMyResult(null);
      }, 2000);
    }
  }, [gameMode, userAnswer, socket, questionIndex, playerScore, opponentScore, botAnswerData, playerName, timeLeft, myResult, currentQuestion, fetchNextSoloQuestion]);

  // Timer logic for Bot/Practice
  useEffect(() => {
    if (screen !== 'playing' || !currentQuestion || loading) return;
    if (gameMode === 'ranked') return;

    if (timeLeft <= 0) {
      console.log('[Game] Time expired');
      handleSubmitAnswer(true);
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [screen, currentQuestion, timeLeft, gameMode, handleSubmitAnswer, loading]);

  // Bot logic
  useEffect(() => {
    if (screen !== 'playing' || gameMode !== 'bot' || !currentQuestion || loading) return;

    setBotAnswered(false);
    setBotAnswerData(null);

    const rank = playerRank;
    const botAccuracy = rank < 900 ? 0.4 : rank < 1200 ? 0.6 : rank < 1500 ? 0.75 : 0.85;
    const responseTime = rank < 900 ? 9000 : rank < 1200 ? 7000 : rank < 1500 ? 5000 : 3000;

    console.log(`[Bot] Bot is thinking (Accuracy: ${botAccuracy}, Time: ${responseTime}ms)...`);

    const botTimer = setTimeout(async () => {
      const correct = Math.random() < botAccuracy;
      console.log(`[Bot] Bot has answered. Correct: ${correct}`);
      setBotAnswered(true);
      setBotAnswerData({
        answered: correct ? 'Correct Answer' : 'Wrong Answer',
        correct
      });
    }, responseTime);

    return () => clearTimeout(botTimer);
  }, [screen, gameMode, currentQuestion, playerRank, loading]);

  const joinRanked = useCallback(() => {
    if (!playerName.trim() || !socket) return;
    console.log('[Socket] Emitting joinGame:', playerName, playerRank);
    setGameMode('ranked');
    socket.emit('joinGame', { playerName, rank: playerRank });
    setScreen('waiting');
  }, [playerName, socket, playerRank]);

  const startBotGame = useCallback(async () => {
    console.log('[Game] Starting Bot Duel');
    setGameMode('bot');
    setRoomInfo({ opponent: { name: 'Bot Knight' } });
    await fetchNextSoloQuestion();
    setScreen('playing');
  }, [fetchNextSoloQuestion]);

  const startPractice = useCallback(async () => {
    console.log('[Game] Starting Solo Practice');
    setGameMode('practice');
    setRoomInfo(null);
    await fetchNextSoloQuestion();
    setScreen('playing');
  }, [fetchNextSoloQuestion]);

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
    loading
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
