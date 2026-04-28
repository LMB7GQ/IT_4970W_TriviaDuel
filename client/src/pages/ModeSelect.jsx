import React, { useState, useEffect } from 'react';
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortBy, setSortBy] = useState('wins');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/leaderboard', {
          cache: 'no-store'
        });

        const data = await res.json();
        console.log("LEADERBOARD DATA:", data);
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      }
    };

    fetchLeaderboard();
  }, []);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'wins') return (b.wins || 0) - (a.wins || 0);
    if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0);
    return 0;
  });

  return (
    <div className="mode-select-layout">

      <div left-layout />
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
          <>
            <ModeCard
              title="Ranked Match"
              description="Compete against other players for ranking."
              onClick={joinRanked}
            />

            <ModeCard
              title="Invite a Player"
              description="Challenge a specific player to a duel."
              onClick={() => setShowInviteModal(true)}
            />

            <button onClick={() => setScreen('userProfile')}>
              View Profile
            </button>
          </>
        )}

        <button onClick={logout}>Logout</button>
      </div>

      <div className="leaderboard-section">
        <h3>Leaderboard</h3>

        <div className="leaderboard-buttons">
          <button onClick={() => setSortBy('wins')}>Top Wins</button>
          <button onClick={() => setSortBy('streak')}>Top Streak</button>
        </div>

        {sortedLeaderboard.length === 0 ? (
          <p>No leaderboard data yet.</p>
        ) : (
          <ul>
            {sortedLeaderboard.map((user, index) => (
              <li key={user._id}>
                #{index + 1} {user.username} — 
                
                {sortBy === 'wins' && (
                  <>Wins: {user.wins}</>
                )}

                {sortBy === 'streak' && (
                  <>Streak: {user.streak}</>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showInviteModal && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

export default ModeSelect;