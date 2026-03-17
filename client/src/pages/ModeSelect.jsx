import React from 'react';
import { useGame } from '../contexts/GameContext';
import ModeCard from '../components/ModeCard';

function ModeSelect() {
  const { playerName, setScreen, startPractice, startBotGame, joinRanked } = useGame();

  return (
    <div className="join-section">
      <h2>Welcome, {playerName}</h2>
      <p>Choose your duel mode.</p>
      
      <ModeCard 
        title="Solo Practice" 
        description="Play practice rounds and improve your knowledge." 
        onClick={startPractice} 
      />
      <ModeCard 
        title="Bot Duel" 
        description="Compete against an adaptive AI bot." 
        onClick={startBotGame} 
      />
      <ModeCard 
        title="Ranked Match" 
        description="Compete against other players for ranking." 
        onClick={joinRanked} 
      />

      <button onClick={() => setScreen('login')} style={{marginTop: '20px'}}>Log Out</button>
    </div>
  );
}

export default ModeSelect;
