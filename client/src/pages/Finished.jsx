import React from 'react';
import { useGame } from '../contexts/GameContext';

function Finished() {
  const { playerName, playerScore, opponentScore, roomInfo, gameMode, resetGame } = useGame();

  return (
    <div className="game-section">
      <h2>Battle Complete</h2>
      <div className="scoreboard">
        <div className="score-card">
          {playerName}<br />Final Score: {playerScore}
        </div>
        {gameMode !== 'practice' && (
          <div className="score-card">
            {roomInfo?.opponent?.name || 'Bot Knight'}<br />Final Score: {opponentScore}
          </div>
        )}
      </div>
      <button onClick={resetGame}>Back to Menu</button>
    </div>
  );
}

export default Finished;
