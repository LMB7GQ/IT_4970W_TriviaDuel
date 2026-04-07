import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

function InviteModal({ isOpen, onClose }) {
  const { sendInvite, isAuthenticated } = useGame();
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  const handleSendInvite = () => {
    if (!username.trim()) {
      setMessage('Please enter a username.');
      return;
    }
    if (!isAuthenticated) {
      setMessage('You must be logged in to send invites.');
      return;
    }
    sendInvite(username.trim());
    setMessage('Invite sent!');
    setUsername('');
    setTimeout(() => {
      setMessage('');
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Send Invite</h3>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendInvite()}
        />
        <div className="modal-buttons">
          <button onClick={handleSendInvite}>Send Invite</button>
          <button onClick={onClose}>Cancel</button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </div>
    </div>
  );
}

export default InviteModal;