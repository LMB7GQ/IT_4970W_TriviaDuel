import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

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
    setLoading(true);
    setMessage('');
    const result = await signup(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setMessage(result.message);
    }
  };

  return (
    <div className="join-section">
      <h2>Create Account</h2>
      <input 
        type="text" 
        placeholder="Username" 
        value={username} 
        onChange={(e) => setUsername(e.target.value)} 
        disabled={loading}
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        disabled={loading}
      />
      <input 
        type="password" 
        placeholder="Confirm Password" 
        value={confirm} 
        onChange={(e) => setConfirm(e.target.value)} 
        disabled={loading}
      />
      <button onClick={handleSignup} disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
      <button onClick={() => setScreen('login')} disabled={loading}>Back to Login</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Signup;
