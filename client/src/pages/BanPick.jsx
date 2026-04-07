import React from 'react';
import { useGame } from '../contexts/GameContext';

function BanPick() {
  const { socket, banPick, roomInfo, gameMode } = useGame();

  // Get completed categories from roomInfo (assuming it has categoryResults)
  const completedCategories = roomInfo?.categoryResults ? Object.keys(roomInfo.categoryResults) : [];

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

  if (!roomInfo || !banPick || !banPick.bans) return null;

  return (
    <div className="game-section">
      <h2>{banPick.phase === 'pick' ? 'Pick a Category' : 'Ban a Category'}</h2>
      <div className="turn-indicator">
        {banPick.turn === roomInfo.myId ? "YOUR TURN" : `Waiting for ${roomInfo.opponent.name}...`}
      </div>
      <div className="category-list">
        {roomInfo.categories.map((cat) => {
          const isBanned = banPick.bans?.includes(cat) || false;
          const isPicked = banPick.pick === cat;
          const isCompleted = completedCategories.includes(cat);
          const isDisabled = isBanned || isPicked || isCompleted;
          return (
            <div 
              key={cat} 
              className={`category-item ${isDisabled ? 'disabled' : ''} ${isPicked ? 'picked' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => !isDisabled && (banPick.phase === 'pick' ? handlePick(cat) : handleBan(cat))}
            >
              {cat}
              {isCompleted && <span className="completed-indicator">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BanPick;
