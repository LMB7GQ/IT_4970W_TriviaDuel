import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import ModeCard from '../components/ModeCard';
import InviteModal from '../components/InviteModal';
import InviteNotification from '../components/InviteNotification';
import GameLogo from '../components/GameLogo';

function ModeSelect() {
  const {
    playerName,
    logout,
    startPractice,
    startBotGame,
    joinRanked,
    isAuthenticated,
    setScreen
  } = useGame();

  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="join-section">
      <GameLogo />

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
        <ModeCard
          title="Invite a Player"
          description="Challenge a specific player to a duel."
          onClick={() => setShowInviteModal(true)}
        />
      )}

      {isAuthenticated && (
        <button onClick={() => setScreen('userProfile')}>
          View Profile
        </button>
      )}

      <button onClick={logout}>Logout</button>

      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}

export default ModeSelect;