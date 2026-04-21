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
    resetGame
  } = useGame();

  const handleQuit = () => {
    if (window.confirm("Are you sure you want to quit this game?")) {
      resetGame();
    }
  };

  return (
    <div className="game-section" style={{ position: 'relative' }}>
      {(gameMode === 'practice' || gameMode === 'bot') && (
        <button 
          onClick={handleQuit}
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
      )}

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
