// Admin Errors - API error logs and analytics
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
} from 'lucide-react';

// Type definitions
interface ApiError {
  id: number;
  errorType: string;
  errorMessage: string | null;
  errorCode: string | null;
  endpoint: string | null;
  occurredAt: string;
  resolved: boolean;
}

interface ErrorStats {
  hourly: Array<{ period: string; count: number }>;
  daily: Array<{ period: string; count: number }>;
  byType: Record<string, number>;
  summary: {
    total: number;
    unresolved: number;
    last24h: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Error type configuration for display
const errorTypeConfig: Record<string, { label: string; icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  rate_limit: {
    label: 'Rate Limit',
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  auth: {
    label: 'Authentication',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  network: {
    label: 'Network',
    icon: WifiOff,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  api_change: {
    label: 'API Change',
    icon: RefreshCw,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  other: {
    label: 'Other',
    icon: AlertCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
};

// Error type badge component
function ErrorTypeBadge({ type }: { type: string }) {
  const config = errorTypeConfig[type] || errorTypeConfig.other;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

// Format timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Format relative time
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Stats card component
function StatsCard({ title, value, icon: Icon, color }: {
  title: string;
  value: number;
  icon: typeof AlertTriangle;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// Simple bar chart for error rate visualization
function ErrorRateChart({ data, title, valueFormat = 'count' }: {
  data: Array<{ period: string; count: number }>;
  title: string;
  valueFormat?: 'count' | 'time';
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const formatLabel = (period: string) => {
    if (valueFormat === 'time') {
      // For hourly data, show just the hour
      const date = new Date(period);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // For daily data, show date
    const date = new Date(period);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground mb-4">{title}</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">
              {formatLabel(item.period)}
            </span>
            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-destructive/70 rounded-full transition-all duration-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-foreground w-8 text-right">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Error by type chart
function ErrorByTypeChart({ byType }: { byType: Record<string, number> }) {
  const entries = Object.entries(byType);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground mb-4">Errors by Type</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <p>No errors recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground mb-4">Errors by Type</h3>
      <div className="space-y-3">
        {entries.map(([type, count]) => {
          const config = errorTypeConfig[type] || errorTypeConfig.other;
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${config.color}`}>{config.label}</span>
                <span className="text-muted-foreground">{count} ({percentage}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.bgColor} opacity-70 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Error log table component
function ErrorLogTable({
  errors,
  pagination,
  onPageChange,
  loading,
}: {
  errors: ApiError[];
  pagination: Pagination | null;
  onPageChange: (page: number) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Error Log</h3>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading errors...</span>
          </div>
        </div>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Error Log</h3>
        </div>
        <div className="p-8 flex flex-col items-center justify-center text-muted-foreground">
          <Wifi className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">No errors recorded</p>
          <p className="text-sm">All systems running smoothly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Error Log</h3>
        {pagination && (
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                Timestamp
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                Type
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                Message
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                Endpoint
              </th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {errors.map((error) => (
              <tr key={error.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-sm text-foreground">
                    {formatRelativeTime(error.occurredAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(error.occurredAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ErrorTypeBadge type={error.errorType} />
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-md">
                    <p className="text-sm text-foreground truncate">
                      {error.errorMessage || 'No message'}
                    </p>
                    {error.errorCode && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Code: {error.errorCode}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-muted-foreground">
                    {error.endpoint || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {error.resolved ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <XCircle className="h-3.5 w-3.5" />
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-border flex items-center justify-between">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 text-sm rounded-md transition-colors ${
                    pagination.page === pageNum
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background hover:bg-accent'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminErrors() {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Fetch error logs
  const fetchErrors = async (page = 1, type = selectedType) => {
    try {
      setLoading(true);
      const typeParam = type !== 'all' ? `&type=${type}` : '';
      const response = await fetch(
        `http://localhost:3001/api/admin/errors?page=${page}&limit=20${typeParam}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Auto-login for development
          await fetch('http://localhost:3001/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: 'admin', password: 'admin' }),
          });
          // Retry
          const retryResponse = await fetch(
            `http://localhost:3001/api/admin/errors?page=${page}&limit=20${typeParam}`,
            { credentials: 'include' }
          );
          if (!retryResponse.ok) throw new Error('Failed to fetch errors');
          const data = await retryResponse.json();
          setErrors(data.errors);
          setPagination(data.pagination);
          return;
        }
        throw new Error('Failed to fetch error logs');
      }

      const data = await response.json();
      setErrors(data.errors);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch error stats
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/errors/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Auto-login for development
          await fetch('http://localhost:3001/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: 'admin', password: 'admin' }),
          });
          // Retry
          const retryResponse = await fetch('http://localhost:3001/api/admin/errors/stats', {
            credentials: 'include',
          });
          if (!retryResponse.ok) throw new Error('Failed to fetch stats');
          const data = await retryResponse.json();
          setStats(data);
          return;
        }
        throw new Error('Failed to fetch error statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch error stats:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchErrors();
    fetchStats();
  }, []);

  // Handle type filter change
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    fetchErrors(1, type);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchErrors(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Error Logs</h1>
          <p className="text-muted-foreground">Monitor API errors and system health</p>
        </div>
        <button
          onClick={() => {
            fetchErrors();
            fetchStats();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Errors"
          value={stats?.summary?.total || 0}
          icon={AlertTriangle}
          color="bg-destructive/10 text-destructive"
        />
        <StatsCard
          title="Unresolved"
          value={stats?.summary?.unresolved || 0}
          icon={AlertCircle}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatsCard
          title="Last 24 Hours"
          value={stats?.summary?.last24h || 0}
          icon={Activity}
          color="bg-blue-500/10 text-blue-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ErrorRateChart
          data={stats?.hourly || []}
          title="Hourly Error Rate (24h)"
          valueFormat="time"
        />
        <ErrorRateChart
          data={stats?.daily || []}
          title="Daily Error Rate (7d)"
          valueFormat="count"
        />
        <ErrorByTypeChart byType={stats?.byType || {}} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filter by type:</span>
        <div className="flex gap-2">
          {['all', 'rate_limit', 'auth', 'network', 'api_change', 'other'].map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background hover:bg-accent'
              }`}
            >
              {type === 'all'
                ? 'All'
                : (errorTypeConfig[type]?.label || type)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Log Table */}
      <ErrorLogTable
        errors={errors}
        pagination={pagination}
        onPageChange={handlePageChange}
        loading={loading}
      />
    </div>
  );
}
