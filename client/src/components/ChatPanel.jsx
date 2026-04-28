import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';

function ChatPanel({isMinimized, setIsMinimized}) {
  const { chatMessages, sendMessage, playerName, roomInfo } = useGame();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isMinimized]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Only show chat if in a room
  if (!roomInfo?.roomId) return null;

  return (
    <div className={`chat-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header">
        <h4>Chat</h4>
        <button onClick={() => setIsMinimized(!isMinimized)}>
          {isMinimized ? 'Open' : 'Minimize'}
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-message ${msg.from === playerName ? 'own-message' : ''}`}
              >
                <span className="chat-sender">{msg.from}:</span>
                <span className="chat-text">{msg.message}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={200}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPanel;