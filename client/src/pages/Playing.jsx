import React from 'react';
import { useGame } from '../contexts/GameContext';

function Playing() {
  const {
    gameMode, playerName, roomInfo,
    currentQuestion, userAnswer, setUserAnswer,
    roundResults, myResult,
    playerScore, opponentScore,
    timeLeft,
    botAnswered,
    handleSubmitAnswer,
    resetGame,
    leaveMatch
  } = useGame();

  const [showQuitModal, setShowQuitModal] = React.useState(false);

  const handleQuitConfirm = () => {
    if (gameMode === 'ranked') {
      leaveMatch();
    } else {
      resetGame();
    }
    setShowQuitModal(false);
  };

  return (
    <div className="game-section" style={{ position: 'relative' }}>
      {/* Quit Confirmation Modal */}
      {showQuitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '2px solid #e94560',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ color: '#e94560', marginBottom: '20px', fontSize: '24px' }}>
              {gameMode === 'ranked' ? 'Forfeit Match?' : 'Quit Game?'}
            </h2>
            <p style={{ color: '#fff', marginBottom: '30px', fontSize: '16px', lineHeight: '1.5' }}>
              {gameMode === 'ranked' 
                ? "Are you sure you want to leave? This will count as a loss and your rank will decrease." 
                : "Are you sure you want to leave this session and go back to the menu?"}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={handleQuitConfirm}
                style={{ 
                  backgroundColor: '#e94560', 
                  color: 'white', 
                  padding: '12px 24px', 
                  borderRadius: '6px', 
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  transition: 'transform 0.2s'
                }}
              >
                {gameMode === 'ranked' ? 'Leave Match' : 'Yes, Quit'}
              </button>
              <button 
                onClick={() => setShowQuitModal(false)}
                style={{ 
                  backgroundColor: '#4e4e6a', 
                  color: 'white', 
                  padding: '12px 24px', 
                  borderRadius: '6px', 
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => setShowQuitModal(true)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '50px',
          height: '50px',
          backgroundColor: '#d32f2f',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        Quit
      </button>

      <div className="matchup-line">
        {gameMode === 'practice' ? `${playerName} Practice` : `${playerName} vs ${roomInfo?.opponent?.name || 'Bot Knight'}`}
      </div>
      
      {gameMode !== 'ranked' && (
        <div className="timer-box">Time Left: {timeLeft}s</div>
      )}

      <div className="scoreboard">
        <div className="score-card">
          {playerName}<br />Score: {playerScore}
        </div>
        {gameMode !== 'practice' && (
          <div className="score-card">
            {roomInfo?.opponent?.name || 'Bot Knight'}<br />Score: {opponentScore}
          </div>
        )}
      </div>

      <div className="question-area">
        <h2>{currentQuestion?.question}</h2>
        {!myResult ? (
          <>
            <input 
              type="text" 
              placeholder="Type answer..." 
              value={userAnswer} 
              onChange={(e) => setUserAnswer(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
            />
            <button onClick={() => handleSubmitAnswer()}>Submit</button>
          </>
        ) : (
          <div className={`answer-feedback ${myResult.isCorrect ? 'correct' : 'incorrect'}`}>
            {myResult.isCorrect ? 'Correct!' : `Incorrect! Answer: ${myResult.correctAnswer}`}
          </div>
        )}
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
                {info.name || info.playerName}: {info.answer || info.answered} — {info.isCorrect || info.correct ? '✅' : '❌'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Playing;
