// Public layout with header, main content, and footer

import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PublicLayout() {
  const { theme, setTheme } = useTheme();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch last updated timestamp
    const fetchLastUpdated = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/dashboard');
        if (response.ok) {
          const data = await response.json();
          setLastUpdated(data.lastUpdated);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchLastUpdated();
    // Refresh every minute
    const interval = setInterval(fetchLastUpdated, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '--';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return '--';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">Twitter Feels</span>
          </Link>

          {/* Mobile menu button - min 44px touch target for accessibility */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-accent"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Last updated: <span className="text-foreground">{formatTimestamp(lastUpdated)}</span>
            </span>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4">
            <div className="flex flex-col space-y-4">
              <span className="text-sm text-muted-foreground">
                Last updated: <span className="text-foreground">{formatTimestamp(lastUpdated)}</span>
              </span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent w-fit"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-5 w-5" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-5 w-5" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Twitter Feels - Sentiment Analysis Dashboard</p>
          <p className="mt-1">
            <Link to="/admin/login" className="hover:text-primary">
              Admin
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
