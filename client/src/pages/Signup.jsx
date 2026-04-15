import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import GameLogo from '../components/GameLogo';

function Signup() {
  const { signup, setScreen } = useGame();
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
      const result = await signup(username.trim(), password);

      if (!result.success) {
        setMessage(result.message || 'Signup failed');
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

      <h2>Create Account</h2>

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

      <input
        type="password"
        placeholder="Confirm Password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <button onClick={handleSignup} disabled={loading}>
        {loading ? 'Creating...' : 'Create Account'}
      </button>

      <button onClick={() => setScreen('login')}>
        Back to Login
      </button>

      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Signup;