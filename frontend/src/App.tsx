import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

// Public pages (to be implemented)
import Dashboard from '@/pages/Dashboard';
import UserDetail from '@/pages/UserDetail';
import TweetDetail from '@/pages/TweetDetail';
import NotFound from '@/pages/NotFound';

// Admin pages (to be implemented)
import AdminLogin from '@/pages/admin/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminSettings from '@/pages/admin/Settings';
import AdminModels from '@/pages/admin/Models';
import AdminTheme from '@/pages/admin/Theme';
import AdminErrors from '@/pages/admin/Errors';

// Layouts
import PublicLayout from '@/components/layouts/PublicLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="twitter-feels-theme">
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/tweets/:id" element={<TweetDetail />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="models" element={<AdminModels />} />
          <Route path="theme" element={<AdminTheme />} />
          <Route path="errors" element={<AdminErrors />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
