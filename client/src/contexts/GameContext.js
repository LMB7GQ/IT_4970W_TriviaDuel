import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('login');
  const [gameMode, setGameMode] = useState(null);

  const [playerName, setPlayerName] = useState('');
  const [playerRank] = useState(1000);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [userData, setUserData] = useState(null);

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

  const [pendingInvites, setPendingInvites] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  const [matchResult, setMatchResult] = useState(null); // 'win' | 'loss' | 'draw'
  const [finishReason, setFinishReason] = useState('normal'); // 'normal' | 'disconnect'
  const [categoryWinnerName, setCategoryWinnerName] = useState(null);

  useEffect(() => {
    if (isAuthenticated && screen === 'login') {
      setScreen('modeSelect');
    }
  }, [isAuthenticated, screen]);

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);
    console.log(`[Socket] Initialized connection to ${API_URL}`);

    return () => newSocket.disconnect();
  }, []);

  const fetchNextSoloQuestion = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`[Solo] Fetching next question (Rank: ${playerRank})...`);
      const response = await fetch(`${API_URL}/api/questions/random?rank=${playerRank}`);
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
    setScreen(isAuthenticated ? 'modeSelect' : 'login');
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
    setPendingInvites([]);
    setChatMessages([]);
    setMatchResult(null);
    setFinishReason('normal');
    setCategoryWinnerName(null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => {
      console.log('[Socket] Event: waiting');
      setScreen('waiting');
    });

    socket.on('matchReady', (data) => {
      if (screen !== 'waiting' && screen !== 'modeSelect') {
        console.log('[Socket] Ignoring matchReady, no longer available for match');
        return;
      }

      console.log('[Socket] Event: matchReady', data);

      if (screen === 'modeSelect') {
        setGameMode('ranked');
      }

      setPendingInvites([]);
      setChatMessages([]);
      setMatchResult(null);
      setFinishReason('normal');
      setCategoryWinnerName(null);

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
        roomInfo?.myId && data.results
          ? Object.keys(data.results).find((id) => id !== roomInfo.myId)
          : null;

      if (oppId && data.results?.[oppId]) {
        setOpponentScore(data.results[oppId].score);
      }

      if (data.categoryWinner && data.results?.[data.categoryWinner]) {
        setCategoryWinnerName(data.results[data.categoryWinner].name);
      }

      if (data.matchWinner) {
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
      }
       else if (!data.categoryDone) {
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setQuestionIndex(data.questionIndex);
          setRoundResults(null);
          setTimeLeft(15);
        }, 2000);
      } else {
        console.log('[Socket] Category completed, returning to ban/pick phase');
        setTimeout(() => {
          setCurrentQuestion(null);
          setRoundResults(null);
          setScreen('banPick');
        }, 2000);
      }
    });

    socket.on('opponentDisconnected', (data) => {
      console.log('[Socket] Event: opponentDisconnected', data);
      setFinishReason('disconnect');
      setMatchResult('win');
      setRoundResults(null);
      setMyResult(null);
      setTimeout(() => setScreen('finished'), 500);
    });

    socket.on('inviteReceived', (data) => {
      console.log('[Socket] Event: inviteReceived', data);
      setPendingInvites((prev) => [...prev, data]);
    });

    socket.on('inviteSent', (data) => {
      console.log('[Socket] Event: inviteSent', data);
    });

    socket.on('inviteExpired', (data) => {
      console.log('[Socket] Event: inviteExpired', data);
      setPendingInvites((prev) => prev.filter((invite) => invite.inviteId !== data.inviteId));
    });

    socket.on('inviteDeclined', (data) => {
      console.log('[Socket] Event: inviteDeclined', data);
    });

    socket.on('inviteError', (data) => {
      console.log('[Socket] Event: inviteError', data);
      alert(data.message);
    });

    socket.on('newMessage', (data) => {
      console.log('[Socket] Event: newMessage', data);
      setChatMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off('waiting');
      socket.off('matchReady');
      socket.off('banPickUpdate');
      socket.off('categoryStart');
      socket.off('answerAcknowledged');
      socket.off('roundResults');
      socket.off('opponentDisconnected');
      socket.off('inviteReceived');
      socket.off('inviteSent');
      socket.off('inviteExpired');
      socket.off('inviteDeclined');
      socket.off('inviteError');
      socket.off('newMessage');
    };
  }, [socket, roomInfo, resetGame, screen]);

  const handleSubmitAnswer = useCallback(async (timeExpired = false) => {
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
      const resp = await fetch(`${API_URL}/api/questions/${currentQuestion._id}/check`, {
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
    
      if (gameMode === 'practice') {
        setTimeout(() => {
          alert('Practice complete!');
          resetGame();
        }, 1000);
      } else {
        if (gameMode === 'bot') {
          if (newPlayerScore > newOpponentScore) {
            setMatchResult('win');
          } else if (newPlayerScore < newOpponentScore) {
            setMatchResult('loss');
          } else {
            setMatchResult('draw');
          }
        }
    
        setFinishReason('normal');
        setTimeout(() => setScreen('finished'), 2000);
      }
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
  }, [
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
    fetchNextSoloQuestion,
    resetGame
  ]);

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

  useEffect(() => {
    if (screen !== 'playing' || gameMode !== 'bot' || !currentQuestion || loading) return;

    setBotAnswered(false);
    setBotAnswerData(null);

    const rank = playerRank;
    const botAccuracy = rank < 900 ? 0.4 : rank < 1200 ? 0.6 : rank < 1500 ? 0.75 : 0.85;
    const responseTime = rank < 900 ? 9000 : rank < 1200 ? 7000 : rank < 1500 ? 5000 : 3000;

    console.log(`[Bot] Bot is thinking (Accuracy: ${botAccuracy}, Time: ${responseTime}ms)...`);

    const botTimer = setTimeout(() => {
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
    if (!playerName.trim() || !socket || !isAuthenticated) return;
    console.log('[Socket] Emitting joinGame:', playerName, playerRank);
    setGameMode('ranked');
    setMatchResult(null);
    setFinishReason('normal');
    setCategoryWinnerName(null);
    socket.emit('joinGame', { playerName, rank: playerRank });
    setScreen('waiting');
  }, [playerName, socket, playerRank, isAuthenticated]);

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

  const sendInvite = useCallback((toUsername) => {
    if (!socket || !isAuthenticated) return;
    console.log('[Socket] Emitting sendInvite:', toUsername);
    socket.emit('sendInvite', { toUsername });
  }, [socket, isAuthenticated]);

  const acceptInvite = useCallback((inviteId) => {
    if (!socket) return;
    console.log('[Socket] Emitting acceptInvite:', inviteId);
    socket.emit('acceptInvite', { inviteId });
    setPendingInvites((prev) => prev.filter((invite) => invite.inviteId !== inviteId));
  }, [socket]);

  const declineInvite = useCallback((inviteId) => {
    if (!socket) return;
    console.log('[Socket] Emitting declineInvite:', inviteId);
    socket.emit('declineInvite', { inviteId });
    setPendingInvites((prev) => prev.filter((invite) => invite.inviteId !== inviteId));
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (!socket || !roomInfo?.roomId) return;
    console.log('[Socket] Emitting sendMessage:', message);
    socket.emit('sendMessage', { roomId: roomInfo.roomId, message });
  }, [socket, roomInfo]);

  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  
      const data = await response.json();
  
      if (response.ok) {
        const receivedToken = data.token || null;
        const receivedUser = data.user || { username };
  
        if (receivedToken) {
          setToken(receivedToken);
          localStorage.setItem('token', receivedToken);
        }
  
        setPlayerName(receivedUser.username || username);
        setUserData(receivedUser);
        setIsAuthenticated(true);
        setScreen('modeSelect');
  
        return { success: true };
      }
  
      return {
        success: false,
        message: data.error || data.message || 'Invalid username or password'
      };
    } catch (err) {
      return { success: false, message: 'Network error' };
    }
  }, []);

  const signup = useCallback(async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  
      const data = await response.json();
  
      if (response.ok) {
        const receivedToken = data.token || null;
        const receivedUser = data.user || { username };
  
        if (receivedToken) {
          setToken(receivedToken);
          localStorage.setItem('token', receivedToken);
        }
  
        setPlayerName(receivedUser.username || username);
        setUserData(receivedUser);
        setIsAuthenticated(true);
        setScreen('modeSelect');
  
        return { success: true };
      }
  
      return {
        success: false,
        message: data.error || data.message || 'Registration failed'
      };
    } catch (err) {
      return { success: false, message: 'Network error' };
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!token) return;
  
    try {
      const response = await fetch(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!response.ok) return;
  
      const data = await response.json();
  
      if (data.user) {
        setUserData(data.user);
        setPlayerName(data.user.username);
      }
    } catch (err) {
      console.error('Fetch user data error:', err);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && screen === 'login') {
      setScreen('modeSelect');
    }
  }, [isAuthenticated, screen]);

  const logout = useCallback(() => {
    setToken(null);
    setIsAuthenticated(false);
    setUserData(null);
    localStorage.removeItem('token');
    setPlayerName('');
    resetGame();
    setScreen('login');
  }, [resetGame]);

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
    pendingInvites,
    setPendingInvites,
    sendInvite,
    acceptInvite,
    declineInvite,
    chatMessages,
    setChatMessages,
    sendMessage,
    login,
    signup,
    logout,
    handleSubmitAnswer,
    loading,
    userData,
    isAuthenticated,
    matchResult,
    finishReason,
    categoryWinnerName
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};