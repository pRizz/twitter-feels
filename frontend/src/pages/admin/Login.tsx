// Admin Login page
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, fetchCsrfToken } from '@/lib/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get the return URL from query params (set by AdminLayout when redirecting to login)
  const returnTo = searchParams.get('returnTo');
  // Check if session expired (set by AdminLayout when session times out)
  const sessionExpired = searchParams.get('sessionExpired') === 'true';

  // Fetch CSRF token on page load
  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate whitespace-only input
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/admin/login', { username, password });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      // Successful login - navigate to original destination or admin dashboard
      // Validate returnTo to ensure it's an admin route (security)
      const destination = returnTo && returnTo.startsWith('/admin')
        ? decodeURIComponent(returnTo)
        : '/admin';
      navigate(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-card-lg border border-border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground mt-2">Twitter Feels Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {sessionExpired && (
            <div role="alert" className="p-3 bg-warning/10 text-warning border border-warning/20 rounded-md text-sm">
              Your session has expired. Please log in again.
            </div>
          )}
          {error && (
            <div role="alert" className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
