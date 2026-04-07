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

  const [matchResult, setMatchResult] = useState(null); // 'win' | 'loss' | 'draw'
  const [finishReason, setFinishReason] = useState('normal'); // 'normal' | 'disconnect'
  const [categoryWinnerName, setCategoryWinnerName] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);
    console.log('[Socket] Initialized connection to http://localhost:5001');
    return () => newSocket.disconnect();
  }, []);

  const fetchNextSoloQuestion = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`[Solo] Fetching next question (Rank: ${playerRank})...`);
      const response = await fetch(`http://localhost:5001/api/questions/random?rank=${playerRank}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      console.log('[Solo] Fetched Question:', data._id, data.question);
      setCurrentQuestion(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('[Solo] Fetch error:', err);
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
    setMatchResult(null);
    setFinishReason('normal');
    setCategoryWinnerName(null);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => {
      console.log('[Socket] Event: waiting');
      setScreen('waiting');
    });

    socket.on('matchReady', (data) => {
      if (screen !== 'waiting') {
        console.log('[Socket] Ignoring matchReady, no longer waiting');
        return;
      }

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
      setCategoryWinnerName(null);
    });

    socket.on('answerAcknowledged', (data) => {
      console.log('[Socket] Event: answerAcknowledged', data);
      setMyResult(data);
    });

    socket.on('roundResults', (data) => {
      console.log('[Socket] Event: roundResults', data);
      setRoundResults(data.results);
      setMyResult(null);

      if (roomInfo?.myId && data.results?.[roomInfo.myId]) {
        setPlayerScore(data.results[roomInfo.myId].score);
      }

      const oppId =
        roomInfo?.myId &&
        data.results
          ? Object.keys(data.results).find((id) => id !== roomInfo.myId)
          : null;

      if (oppId && data.results?.[oppId]) {
        setOpponentScore(data.results[oppId].score);
      }

      if (data.categoryWinner && roomInfo?.myId && data.results) {
        const winnerName =
          data.results[data.categoryWinner]?.name ||
          (data.categoryWinner === roomInfo.myId
            ? playerName
            : roomInfo?.opponent?.name || 'Opponent');

        setCategoryWinnerName(winnerName);
      }

      if (data.matchWinner) {
        console.log('[Socket] Match Over. Winner:', data.matchWinner);

        const myFinalScore =
          roomInfo?.myId && data.results?.[roomInfo.myId]
            ? data.results[roomInfo.myId].score
            : 0;

        const oppFinalId =
          roomInfo?.myId && data.results
            ? Object.keys(data.results).find((id) => id !== roomInfo.myId)
            : null;

        const oppFinalScore =
          oppFinalId && data.results?.[oppFinalId]
            ? data.results[oppFinalId].score
            : 0;

        setPlayerScore(myFinalScore);
        setOpponentScore(oppFinalScore);
        setFinishReason('normal');

        if (myFinalScore > oppFinalScore) {
          setMatchResult('win');
        } else if (myFinalScore < oppFinalScore) {
          setMatchResult('loss');
        } else {
          setMatchResult('draw');
        }

        setTimeout(() => setScreen('finished'), 2000);
      } else if (!data.categoryDone) {
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setQuestionIndex(data.questionIndex);
          setRoundResults(null);
          setTimeLeft(15);
          setCategoryWinnerName(null);
        }, 2000);
      }
    });

    socket.on('opponentDisconnected', (data) => {
      console.log('[Socket] Event: opponentDisconnected', data);
      setFinishReason('disconnect');
      setMatchResult('win');
      setRoundResults(null);
      setMyResult(null);
      setCategoryWinnerName(null);
      setTimeout(() => setScreen('finished'), 500);
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
  }, [socket, roomInfo, resetGame, screen, playerName]);

  const handleSubmitAnswer = useCallback(
    async (timeExpired = false) => {
      const submittedAnswer = timeExpired ? '' : userAnswer;
      console.log(`[Game] Submitting answer: "${submittedAnswer}" (Mode: ${gameMode})`);

      if (!timeExpired && !userAnswer.trim() && !myResult) return;
      if (myResult) return;

      if (gameMode === 'ranked') {
        if (socket) {
          socket.emit('submitAnswer', {
            answer: submittedAnswer,
            responseTime: 15 - timeLeft
          });
          setUserAnswer('');
        }
        return;
      }

      let isCorrect = false;
      let correctAnswer = '';
      try {
        console.log(`[Solo] Validating answer for question ${currentQuestion._id}...`);
        const resp = await fetch(`http://localhost:5001/api/questions/${currentQuestion._id}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAnswer: submittedAnswer })
        });
        const checkData = await resp.json();
        isCorrect = checkData.correct;
        correctAnswer = checkData.correctAnswer;
        console.log(`[Solo] Result: ${isCorrect ? 'CORRECT' : 'WRONG'}. Correct: "${correctAnswer}"`);
      } catch (err) {
        console.error('[Solo] Answer check error:', err);
      }

      let newPlayerScore = playerScore;
      let newOpponentScore = opponentScore;

      if (isCorrect) newPlayerScore += 1;
      setPlayerScore(newPlayerScore);

      const results = {
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
        setFinishReason('normal');

        if (gameMode === 'practice') {
          if (newPlayerScore >= 3) {
            setMatchResult('win');
          } else {
            setMatchResult('loss');
          }
        } else if (gameMode === 'bot') {
          if (newPlayerScore > newOpponentScore) {
            setMatchResult('win');
          } else if (newPlayerScore < newOpponentScore) {
            setMatchResult('loss');
          } else {
            setMatchResult('draw');
          }
        }

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
    },
    [
      gameMode,
      userAnswer,
      socket,
      questionIndex,
      playerScore,
      opponentScore,
      botAnswerData,
      playerName,
      timeLeft,
      myResult,
      currentQuestion,
      fetchNextSoloQuestion
    ]
  );

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
  }, [screen, currentQuestion, timeLeft, gameMode, handleSubmitAnswer, loading, setTimeLeft]);

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
    setMatchResult(null);
    setFinishReason('normal');
    socket.emit('joinGame', { playerName, rank: playerRank });
    setScreen('waiting');
  }, [playerName, socket, playerRank]);

  const startBotGame = useCallback(async () => {
    console.log('[Game] Starting Bot Duel');
    setGameMode('bot');
    setRoomInfo({ opponent: { name: 'Bot Knight' } });
    setPlayerScore(0);
    setOpponentScore(0);
    setQuestionIndex(0);
    setUserAnswer('');
    setRoundResults(null);
    setMyResult(null);
    setMatchResult(null);
    setFinishReason('normal');
    setCategoryWinnerName(null);
    await fetchNextSoloQuestion();
    setScreen('playing');
  }, [fetchNextSoloQuestion]);

  const startPractice = useCallback(async () => {
    console.log('[Game] Starting Solo Practice');
    setGameMode('practice');
    setRoomInfo(null);
    setPlayerScore(0);
    setOpponentScore(0);
    setQuestionIndex(0);
    setUserAnswer('');
    setRoundResults(null);
    setMyResult(null);
    setMatchResult(null);
    setFinishReason('normal');
    setCategoryWinnerName(null);
    await fetchNextSoloQuestion();
    setScreen('playing');
  }, [fetchNextSoloQuestion]);

  const cancelSearch = useCallback(() => {
    console.log('[Game] Canceling search...');

    if (socket && socket.connected) {
      socket.emit('leaveMatchup');
    }

    resetGame();
  }, [socket, resetGame]);

  const value = {
    socket,
    screen,
    setScreen,
    gameMode,
    setGameMode,
    playerName,
    setPlayerName,
    playerRank,
    roomInfo,
    banPick,
    currentQuestion,
    userAnswer,
    setUserAnswer,
    roundResults,
    myResult,
    playerScore,
    opponentScore,
    questionIndex,
    timeLeft,
    setTimeLeft,
    botAnswered,
    setBotAnswered,
    botAnswerData,
    setBotAnswerData,
    resetGame,
    joinRanked,
    startBotGame,
    startPractice,
    cancelSearch,
    handleSubmitAnswer,
    loading,
    matchResult,
    finishReason,
    categoryWinnerName
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};