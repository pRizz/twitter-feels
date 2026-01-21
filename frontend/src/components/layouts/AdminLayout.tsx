// Admin layout with sidebar navigation

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Cpu,
  Palette,
  AlertTriangle,
  LogOut,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import { api, fetchCsrfToken } from '@/lib/api';

// Authentication hook that checks session with backend
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Fetch CSRF token first to ensure we have one for authenticated requests
        await fetchCsrfToken();

        const response = await api.get('/api/admin/me');
        if (response.ok) {
          setIsAuthenticated(true);
          setSessionExpired(false);
        } else {
          // Check if session expired
          const data = await response.json();
          setSessionExpired(data.sessionExpired === true);
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, isLoading, sessionExpired };
};

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Tracked Users' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
  { path: '/admin/models', icon: Cpu, label: 'LLM Models' },
  { path: '/admin/theme', icon: Palette, label: 'Theme' },
  { path: '/admin/errors', icon: AlertTriangle, label: 'Error Logs' },
];

export default function AdminLayout() {
  const { isAuthenticated, isLoading, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the original URL
  if (!isAuthenticated) {
    // Encode the current path so user can be redirected back after login
    const returnTo = encodeURIComponent(location.pathname + location.search);
    // Add sessionExpired query param if session has expired
    const expiredParam = sessionExpired ? '&sessionExpired=true' : '';
    return <Navigate to={`/admin/login?returnTo=${returnTo}${expiredParam}`} replace />;
  }

  const handleLogout = async () => {
    try {
      await api.post('/api/admin/logout');
    } catch {
      // Ignore errors, still redirect to login
    }
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header with hamburger menu */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border">
        <Link to="/" className="text-xl font-bold text-primary">
          Twitter Feels
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless toggled, always visible on desktop */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-card border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex md:flex-col
        `}
      >
        <div className="p-4 hidden md:block">
          <Link to="/" className="text-xl font-bold text-primary">
            Twitter Feels
          </Link>
          <p className="text-sm text-muted-foreground">Admin Panel</p>
        </div>

        {/* Mobile sidebar header */}
        <div className="p-4 flex items-center justify-between md:hidden border-b border-border">
          <div>
            <Link to="/" className="text-xl font-bold text-primary">
              Twitter Feels
            </Link>
            <p className="text-sm text-muted-foreground">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-4 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border md:border-t-0 md:absolute md:bottom-4 md:left-0 md:right-0 md:px-4">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 text-sm text-muted-foreground hover:text-destructive w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
