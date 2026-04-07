import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

const API_URL = 'http://localhost:5000';

function Login() {
  const { setPlayerName, setScreen } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setMessage('Please enter both username and password.');
      return;
    }
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Login failed');
        return;
      }
      setPlayerName(data.username);
      setScreen('modeSelect');
    } catch (err) {
      setMessage('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-section">
      <h2>Login</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      <button onClick={() => setScreen('signup')}>Create Account</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Login;
