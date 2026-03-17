import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

function Login() {
  const { setPlayerName, setScreen } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setMessage('Please enter both username and password.');
      return;
    }
    setPlayerName(username.trim());
    setScreen('modeSelect');
  };

  return (
    <div className="join-section">
      <h2>Login</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => setScreen('signup')}>Create Account</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Login;
