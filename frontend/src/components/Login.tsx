import { useState } from 'react';
import { login, register } from '../api';
import type { User } from '../api';

interface Props {
  onLogin: (user: User) => void;
}

type Mode = 'login' | 'register';

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = mode === 'login'
        ? await login(email, password)
        : await register(email, password, name || undefined);

      onLogin(data.user);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container glass">
      <div className="login-card">
        <h1>TalentNode</h1>
        <p>AI-powered job search</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="login-input"
          />

          {mode === 'register' && (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name (optional)"
              className="login-input"
            />
          )}

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="login-input"
          />

          {error && <div className="error-bar">{error}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? '...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="login-toggle">
          {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
