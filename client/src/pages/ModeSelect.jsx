import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import ModeCard from '../components/ModeCard';
import InviteModal from '../components/InviteModal';
import InviteNotification from '../components/InviteNotification';

function ModeSelect() {
  const { playerName, setScreen, logout, startPractice, startBotGame, joinRanked, isAuthenticated } = useGame();
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="join-section">
      <InviteNotification />
      
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
      {isAuthenticated && (
        <ModeCard 
          title="Ranked Match" 
          description="Compete against other players for ranking." 
          onClick={joinRanked} 
        />
      )}

      {isAuthenticated && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center', alignItems: 'flex-start' }}>
          <button 
            className="invite-button" 
            onClick={() => setShowInviteModal(true)}
            style={{margin: 0, flex: 1, maxWidth: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px' }}
          >
            Send Invite
          </button>
          <button
            className="invite-button"
            onClick={() => setScreen('userProfile')}
            style={{margin: 0, flex: 1, maxWidth: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px' }}
          >
            User Profile
          </button>

        </div>
      )}


      <button onClick={logout} style={{marginTop: '20px'}}>Log Out</button>

      <InviteModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
      />
    </div>
  );
}

export default ModeSelect;
