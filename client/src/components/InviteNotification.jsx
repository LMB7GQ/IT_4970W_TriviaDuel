import React from 'react';
import { useGame } from '../contexts/GameContext';

function InviteNotification() {
  const { pendingInvites, acceptInvite, declineInvite } = useGame();

  if (pendingInvites.length === 0) return null;

  return (
    <div className="invite-notification">
      {pendingInvites.map((invite) => (
        <div key={invite.inviteId} className="invite-item">
          <p>{invite.message}</p>
          <div className="invite-buttons">
            <button 
              className="accept-btn" 
              onClick={() => acceptInvite(invite.inviteId)}
            >
              Accept
            </button>
            <button 
              className="decline-btn" 
              onClick={() => declineInvite(invite.inviteId)}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default InviteNotification;