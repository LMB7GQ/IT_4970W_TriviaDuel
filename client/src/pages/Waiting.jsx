import React from 'react';
import { useGame } from '../contexts/GameContext';

function Waiting() {
  const { playerName, cancelSearch } = useGame();

  return (
    <div className="waiting-screen">
      <div className="loading-dots">
        <div className="dot red"></div>
        <div className="dot yellow"></div>
        <div className="dot blue"></div>
      </div>
      <div className="matchup-line">{playerName} vs ???</div>
      <p>Searching for an opponent...</p>

      <button className='mode-button' onClick={cancelSearch}>
         Cancel Matchup...
      </button>
    </div>
  );
}

export default Waiting;
