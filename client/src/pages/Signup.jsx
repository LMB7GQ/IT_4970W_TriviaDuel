import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

function Signup() {
  const { setPlayerName, setScreen } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');

  const handleSignup = () => {
    if (!username.trim() || !password.trim() || !confirm.trim()) {
      setMessage('Please fill out all fields.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setPlayerName(username.trim());
    setScreen('modeSelect');
  };

  return (
    <div className="join-section">
      <h2>Create Account</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <button onClick={handleSignup}>Create Account</button>
      <button onClick={() => setScreen('login')}>Back to Login</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Signup;
