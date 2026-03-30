import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';

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
    setLoading(true);
    setMessage('');
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setMessage(result.message);
    }
  };

  return (
    <div className="join-section">
      <h2>Login</h2>
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
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      <button onClick={() => setScreen('signup')} disabled={loading}>Create Account</button>
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default Login;
