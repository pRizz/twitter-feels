// Public layout with header, main content, and footer

import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun } from 'lucide-react';

export default function PublicLayout() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-primary">Twitter Feels</span>
          </Link>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Last updated: <span className="text-foreground">--</span>
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
