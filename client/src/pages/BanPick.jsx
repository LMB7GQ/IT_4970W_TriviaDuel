import React from 'react';
import { useGame } from '../contexts/GameContext';
import ChatPanel from '../components/ChatPanel';

function BanPick() {
  const { socket, banPick, roomInfo, gameMode, leaveMatch } = useGame();
  const [showQuitModal, setShowQuitModal] = React.useState(false);

  // Get completed categories from roomInfo
  const completedCategories = roomInfo?.categoryResults ? Object.keys(roomInfo.categoryResults) : [];
  

const isReserve = banPick?.isReserve || false;
const displayCategories = isReserve
  ? (roomInfo?.availableCategories || roomInfo?.categories?.filter(c => !completedCategories.includes(c)) || [])
  : (roomInfo?.categories || []);
  const handleBan = (category) => {
    if (gameMode === 'ranked' && socket && banPick?.turn === roomInfo?.myId) {
      socket.emit('banCategory', { category });
    }
  };

  const handlePick = (category) => {
    if (gameMode === 'ranked' && socket && banPick?.turn === roomInfo?.myId) {
      socket.emit('pickCategory', { category });
    }
  };

  const handleQuitConfirm = () => {
    leaveMatch();
    setShowQuitModal(false);
  };

  if (!roomInfo || !banPick || !banPick.bans) return null;

  return (
    <div className="game-section" style={{ position: 'relative' }}>
      {/* Quit Confirmation Modal */}
      {showQuitModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a2e', padding: '40px', borderRadius: '12px',
            textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            border: '2px solid #e94560', maxWidth: '400px', width: '90%'
          }}>
            <h2 style={{ color: '#e94560', marginBottom: '20px', fontSize: '24px' }}>Forfeit Match?</h2>
            <p style={{ color: '#fff', marginBottom: '30px', fontSize: '16px', lineHeight: '1.5' }}>
              Are you sure you want to leave? This will count as a loss and your rank will decrease.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={handleQuitConfirm} style={{ backgroundColor: '#e94560', color: 'white', padding: '12px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Leave Match
              </button>
              <button onClick={() => setShowQuitModal(false)} style={{ backgroundColor: '#4e4e6a', color: 'white', padding: '12px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowQuitModal(true)}
        style={{
          position: 'absolute', top: '10px', right: '10px',
          width: '50px', height: '50px', backgroundColor: '#d32f2f',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 'bold', borderRadius: '4px',
          border: 'none', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        Quit
      </button>

      {/* ✅ Updated header — shows tiebreaker label for reserve rounds */}
      {/* ✅ Updated header */}
<h2>
  {isReserve
    ? 'Tiebreaker — Pick a Category'
    : banPick.phase === 'pick'
      ? 'Pick a Category'
      : 'Ban a Category'
  }
</h2>

<div className="turn-indicator">
  {banPick.turn === roomInfo.myId ? 'YOUR TURN' : `Waiting for ${roomInfo.opponent.name}...`}
</div>

{/* ✅ Use displayCategories instead of roomInfo.categories */}
<div className="category-list">
  {displayCategories.map((cat) => {
    const isBanned = !isReserve && (banPick.bans?.includes(cat) || false);
    const isPicked = banPick.pick === cat;
    const isCompleted = completedCategories.includes(cat);
    const isDisabled = isBanned || isPicked || isCompleted;
    return (
      <div
        key={cat}
        className={`category-item ${isDisabled ? 'disabled' : ''} ${isPicked ? 'picked' : ''} ${isCompleted ? 'completed' : ''}`}
        onClick={() => {
          if (isDisabled) return;
          if (isReserve || banPick.phase === 'pick') {
            handlePick(cat);
          } else {
            handleBan(cat);
          }
        }}
      >
        {cat}
        {isCompleted && <span className="completed-indicator">✓</span>}
      </div>
    );
  })}
</div>

      {gameMode === 'ranked' && <ChatPanel />}
    </div>
  );
}

export default BanPick;