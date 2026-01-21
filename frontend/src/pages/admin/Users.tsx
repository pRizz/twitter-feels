// Admin Users - Manage tracked Twitter users
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

interface TrackedUser {
  id: number;
  twitterId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isActive: boolean;
  tweetCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { success: showSuccess } = useToast();
  const [users, setUsers] = useState<TrackedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [adding, setAdding] = useState(false);
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  // Ref for synchronous rapid-click prevention (state updates are async in React)
  const deletingRef = useRef<number | null>(null);

  // Validate Twitter handle format
  // Valid: alphanumeric and underscores, 1-15 characters (excluding optional @ prefix)
  const validateHandle = (handle: string): string | null => {
    const trimmed = handle.trim();
    if (!trimmed) {
      return 'Twitter handle is required';
    }

    // Remove leading @ if present
    const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

    if (!username) {
      return 'Twitter handle is required';
    }

    // Check length (1-15 characters)
    if (username.length > 15) {
      return 'Handle must be 15 characters or less';
    }

    // Check for valid characters (alphanumeric and underscore only)
    const validPattern = /^[A-Za-z0-9_]+$/;
    if (!validPattern.test(username)) {
      return 'Handle can only contain letters, numbers, and underscores';
    }

    return null; // Valid
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/users', {
        credentials: 'include',
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [navigate]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate handle format
    const validationError = validateHandle(newHandle);
    if (validationError) {
      setHandleError(validationError);
      setHandleTouched(true);
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('http://localhost:3001/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          handle: newHandle.trim(),
          displayName: newDisplayName.trim() || undefined,
        }),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (response.status === 409) {
        setError('User is already being tracked');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to add user');
      }

      // Get the username for the success message (strip @ if present)
      const addedUsername = newHandle.trim().replace(/^@/, '');

      setNewHandle('');
      setNewDisplayName('');
      setHandleTouched(false);
      setHandleError(null);
      setShowAddForm(false);
      setError(null);

      // Show success toast notification
      showSuccess(`Successfully added @${addedUsername} to tracked users!`);

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (user: TrackedUser) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    // Synchronous check using ref to prevent rapid double-clicks
    // State updates in React are async, so multiple rapid clicks can bypass state checks
    if (deletingRef.current !== null) {
      return;
    }

    // Set ref synchronously to block any subsequent rapid clicks
    deletingRef.current = userId;
    setDeletingUserId(userId);

    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setDeleteConfirm(null);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      deletingRef.current = null;
      setDeletingUserId(null);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tracked Users</h1>
          <p className="text-muted-foreground">
            Manage Twitter accounts being tracked for sentiment analysis
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Add User
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold mb-4">Add New Tracked User</h3>
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="twitter-handle" className="block text-sm text-muted-foreground mb-1">
                Twitter Handle *
              </label>
              <input
                id="twitter-handle"
                type="text"
                value={newHandle}
                onChange={(e) => {
                  setNewHandle(e.target.value);
                  // Clear error when user starts typing
                  if (handleError) {
                    setHandleError(null);
                  }
                }}
                onBlur={() => {
                  setHandleTouched(true);
                  // Validate on blur
                  const validationError = validateHandle(newHandle);
                  setHandleError(validationError);
                }}
                placeholder="@elonmusk"
                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  handleTouched && handleError
                    ? 'border-destructive'
                    : 'border-border'
                }`}
                disabled={adding}
              />
              {handleTouched && handleError && (
                <p className="mt-1 text-sm text-destructive">{handleError}</p>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="display-name" className="block text-sm text-muted-foreground mb-1">
                Display Name (optional)
              </label>
              <input
                id="display-name"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Elon Musk"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={adding}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding || !newHandle.trim() || !!handleError}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewHandle('');
                  setNewDisplayName('');
                  setHandleTouched(false);
                  setHandleError(null);
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-primary">{users.length}</div>
          <div className="text-sm text-muted-foreground">Total Tracked</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-500">
            {users.filter(u => u.isActive).length}
          </div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-muted-foreground">
            {users.reduce((sum, u) => sum + u.tweetCount, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Total Tweets</div>
        </div>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">No Users Tracked Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add Twitter accounts to start tracking their sentiment analysis.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Add Your First User
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Scroll indicator for mobile */}
          <div className="md:hidden text-xs text-muted-foreground px-4 py-2 bg-muted/30 flex items-center gap-2">
            <span>←</span>
            <span>Swipe to see more columns</span>
            <span>→</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap min-w-[180px]">User</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap min-w-[100px]">Handle</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap min-w-[80px]">Status</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap min-w-[90px]">Followers</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap min-w-[70px]">Tweets</th>
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap min-w-[100px]">Added</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-lg">{user.displayName[0]?.toUpperCase() || '?'}</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          {user.bio && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {user.bio}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://twitter.com/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @{user.username}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatNumber(user.followerCount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {user.tweetCount}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Toggle Active Button */}
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            user.isActive
                              ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                              : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                          }`}
                          title={user.isActive ? 'Disable tracking' : 'Enable tracking'}
                        >
                          {user.isActive ? 'Disable' : 'Enable'}
                        </button>

                        {/* Delete Button */}
                        {deleteConfirm === user.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={deletingUserId === user.id}
                              className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingUserId === user.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              disabled={deletingUserId === user.id}
                              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            disabled={deletingUserId !== null}
                            className="px-3 py-1 text-sm bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete user"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="mt-4 text-sm text-muted-foreground">
        Note: In production, adding a user would fetch their profile data from the Twitter API.
        Currently, users are added with placeholder data.
      </p>
    </div>
  );
}
