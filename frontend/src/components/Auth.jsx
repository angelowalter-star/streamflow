import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function Auth({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">StreamFlow</h1>
        <p className="auth-subtitle">Income Tracker für Freelancer</p>

        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Loading...' : isSignUp ? 'Registrieren' : 'Anmelden'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp ? 'Bereits Konto?' : 'Noch kein Konto?'}
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="toggle-button">
            {isSignUp ? 'Anmelden' : 'Registrieren'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Auth;
