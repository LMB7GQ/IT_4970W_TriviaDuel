import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

const API_URL = 'http://localhost:5001';

function Signup() {
  const { setPlayerName, setScreen } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!username.trim() || !password.trim() || !confirm.trim()) {
      setMessage('Please fill out all fields.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 4) {
      setMessage('Password must be at least 4 characters.');
      return;
    }
    setMessage('');
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Signup failed');
        return;
      }
      setPlayerName(data.username);
      setScreen('modeSelect');
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessage('Request timed out. Is the server running on port 5001?');
      } else {
        setMessage('Connection error. Is the server running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-section">
      <h2>Create Account</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <button onClick={handleSignup} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
      <button onClick={() => setScreen('login')}>Back to Login</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Signup;
