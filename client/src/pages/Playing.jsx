import React from 'react';
import { useGame } from '../contexts/GameContext';

function Playing() {
  const {
    gameMode,
    playerName,
    roomInfo,
    currentQuestion,
    userAnswer,
    setUserAnswer,
    roundResults,
    myResult,
    playerScore,
    opponentScore,
    timeLeft,
    botAnswered,
    handleSubmitAnswer,
    categoryWinnerName
  } = useGame();

  return (
    <div className="game-section">
      <div className="matchup-line">
        {gameMode === 'practice'
          ? `${playerName} Practice`
          : `${playerName} vs ${roomInfo?.opponent?.name || 'Bot Knight'}`}
      </div>

      {gameMode !== 'ranked' && (
        <div className="timer-box">Time Left: {timeLeft}s</div>
      )}

      <div className="scoreboard">
        <div className="score-card">
          {playerName}
          <br />
          Score: {playerScore}
        </div>

        {gameMode !== 'practice' && (
          <div className="score-card">
            {roomInfo?.opponent?.name || 'Bot Knight'}
            <br />
            Score: {opponentScore}
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
                {info.name || info.playerName}: {info.answer || info.answered} —{' '}
                {info.isCorrect || info.correct ? '✅' : '❌'}
              </li>
            ))}
          </ul>

          {categoryWinnerName && gameMode === 'ranked' && (
            <div className="category-winner-banner">
              Category Winner: {categoryWinnerName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Playing;