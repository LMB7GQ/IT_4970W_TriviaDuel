import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import GameLogo from '../components/GameLogo';

function Login() {
  const { login, setScreen } = useGame();
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
      const result = await login(username.trim(), password);

      if (!result.success) {
        setMessage(result.message || 'Login failed');
      }
    } catch (err) {
      setMessage('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-section">
      <GameLogo />

      <h2>Login</h2>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <button onClick={() => setScreen('signup')}>
        Create Account
      </button>

      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Login;