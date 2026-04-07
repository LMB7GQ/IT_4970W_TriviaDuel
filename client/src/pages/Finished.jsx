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
    startPractice,
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
  } else if (gameMode === 'practice') {
    resultMessage =
      matchResult === 'win'
        ? 'You completed the practice trial successfully.'
        : 'Keep training, knight. You will return stronger.';
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
    <div className={`game-section finished-screen ${matchResult || ''}`}>
      <h2 className="result-title">{resultTitle}</h2>
      <p className="result-message">{resultMessage}</p>

      <div className="scoreboard">
        <div className="score-card">
          {playerName}
          <br />
          Final Score: {playerScore}
        </div>

        {gameMode !== 'practice' && (
          <div className="score-card">
            {opponentName}
            <br />
            Final Score: {opponentScore}
          </div>
        )}
      </div>

      <div className="finished-buttons">
        {gameMode === 'bot' && (
          <button onClick={startBotGame}>Play Bot Again</button>
        )}

        {gameMode === 'practice' && (
          <button onClick={startPractice}>Practice Again</button>
        )}

        <button onClick={resetGame}>Back to Menu</button>
      </div>
    </div>
  );
}

export default Finished;