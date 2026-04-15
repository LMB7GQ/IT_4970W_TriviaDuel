import React from 'react';
import { useGame } from '../contexts/GameContext';

function Finished() {
  const {
    playerName,
    playerScore,
    opponentScore,
    roomInfo,
    gameMode,
    resetGame,
    matchResult,
    startBotGame,
    finishReason
  } = useGame();

  const opponentName = roomInfo?.opponent?.name || 'Bot Knight';

  let resultTitle = 'Battle Complete';
  if (matchResult === 'win') resultTitle = 'Victory!';
  if (matchResult === 'loss') resultTitle = 'Defeat!';
  if (matchResult === 'draw') resultTitle = 'Draw!';

  let resultMessage = 'The match has ended.';

  if (finishReason === 'disconnect') {
    resultMessage = 'Your opponent disconnected. You claim victory by default.';
  } else if (gameMode === 'bot') {
    if (matchResult === 'win') {
      resultMessage = `You defeated ${opponentName}.`;
    } else if (matchResult === 'loss') {
      resultMessage = `${opponentName} has won this duel.`;
    } else {
      resultMessage = 'Neither side claimed the crown this time.';
    }
  } else if (gameMode === 'ranked') {
    if (matchResult === 'win') {
      resultMessage = `You defeated ${opponentName} in ranked battle.`;
    } else if (matchResult === 'loss') {
      resultMessage = `${opponentName} defeated you in ranked battle.`;
    } else {
      resultMessage = 'This ranked battle ended in a draw.';
    }
  }

  return (
    <div className={`end-screen ${matchResult || ''}`}>
      <div className="end-screen-overlay">
        <div className="end-screen-content">
          <h1 className="end-screen-title">{resultTitle}</h1>
          <p className="end-screen-message">{resultMessage}</p>

          <div className="end-screen-scoreboard">
            <div className="end-screen-score-card">
              <div className="end-screen-name">{playerName}</div>
              <div className="end-screen-score">Final Score: {playerScore}</div>
            </div>

            {gameMode !== 'practice' && (
              <div className="end-screen-score-card">
                <div className="end-screen-name">{opponentName}</div>
                <div className="end-screen-score">Final Score: {opponentScore}</div>
              </div>
            )}
          </div>

          <div className="end-screen-buttons">
            {gameMode === 'bot' && (
              <button onClick={startBotGame}>Play Bot Again</button>
            )}

            <button onClick={resetGame}>Back to Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Finished;