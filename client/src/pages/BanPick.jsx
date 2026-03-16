import React from 'react';
import { useGame } from '../contexts/GameContext';

function BanPick() {
  const { socket, banPick, roomInfo, gameMode } = useGame();

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

  if (!roomInfo || !banPick) return null;

  return (
    <div className="game-section">
      <h2>{banPick.phase === 'pick' ? 'Pick a Category' : 'Ban a Category'}</h2>
      <div className="turn-indicator">
        {banPick.turn === roomInfo.myId ? "YOUR TURN" : `Waiting for ${roomInfo.opponent.name}...`}
      </div>
      <div className="category-list">
        {roomInfo.categories.map((cat) => {
          const isBanned = banPick.bans.includes(cat);
          const isPicked = banPick.pick === cat;
          return (
            <div 
              key={cat} 
              className={`category-item ${isBanned ? 'disabled' : ''} ${isPicked ? 'picked' : ''}`}
              onClick={() => banPick.phase === 'pick' ? handlePick(cat) : handleBan(cat)}
            >
              {cat}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BanPick;
