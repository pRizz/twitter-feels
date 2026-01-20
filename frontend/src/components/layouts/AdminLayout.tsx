// Admin layout with sidebar navigation

import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  Cpu,
  Palette,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

// TODO: Implement actual auth check
const useAuth = () => {
  // Placeholder - will be replaced with actual auth logic
  return { isAuthenticated: true };
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
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border">
        <div className="p-4">
          <Link to="/" className="text-xl font-bold text-primary">
            Twitter Feels
          </Link>
          <p className="text-sm text-muted-foreground">Admin Panel</p>
        </div>

        <nav className="mt-4">
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

        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button
            onClick={() => {
              // TODO: Implement logout
              console.log('Logout');
            }}
            className="flex items-center space-x-3 px-4 py-3 text-sm text-muted-foreground hover:text-destructive w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
