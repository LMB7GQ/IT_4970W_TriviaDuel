import React from 'react';
import logo from '../assets/trivia-duel-logo.png';

function GameLogo({ small = false }) {
  return (
    <div className={`game-logo-wrap ${small ? 'small' : ''}`}>
      <img src={logo} alt="Trivia Duel" className="game-logo" />
    </div>
  );
}

export default GameLogo;