// Admin Dashboard - Overview with crawler status and quick stats
import { useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle2, Loader2, Play, RefreshCw, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// Types for crawler status
interface CrawlerRun {
  id: number;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  tweetsFetched: number;
  tweetsAnalyzed: number;
  errorsCount: number;
}

interface CrawlerConfig {
  intervalHours: number;
  historyDepthDays: number;
  rateLimitPer15Min: number;
}

interface CrawlerStatus {
  status: 'running' | 'idle';
  isRunning: boolean;
  lastRun: CrawlerRun | null;
  nextRun: string | null;
  config: CrawlerConfig;
  recentRuns: CrawlerRun[];
}

// Format timestamp to readable string
function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Format relative time
function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Format time until
function formatTimeUntil(timestamp: string | null): string {
  if (!timestamp) return 'Not scheduled';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMs < 0) return 'Overdue';
  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `in ${diffMins} min`;
  return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
}

// Status badge component
function StatusBadge({ status }: { status: 'running' | 'idle' | 'completed' | 'failed' }) {
  const config = {
    running: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', label: 'Running', animate: true },
    idle: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Idle', animate: false },
    completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', label: 'Completed', animate: false },
    failed: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Failed', animate: false },
  };

  const { icon: Icon, color, bg, label, animate } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${bg} ${color}`}>
      <Icon className={`h-4 w-4 ${animate ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

// Crawler Status Panel Component
function CrawlerStatusPanel({ status, onTrigger, isTriggering }: {
  status: CrawlerStatus | null;
  onTrigger: () => void;
  isTriggering: boolean;
}) {
  if (!status) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.isRunning ? 'bg-primary/10' : 'bg-muted'}`}>
            <Activity className={`h-5 w-5 ${status.isRunning ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Crawler Status</h2>
            <p className="text-sm text-muted-foreground">Twitter data collection service</p>
          </div>
        </div>
        <StatusBadge status={status.status} />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Last Run */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Last Run</p>
          <p className="font-medium text-foreground">
            {status.lastRun ? formatRelativeTime(status.lastRun.completedAt || status.lastRun.startedAt) : 'Never'}
          </p>
          {status.lastRun && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimestamp(status.lastRun.completedAt || status.lastRun.startedAt)}
            </p>
          )}
        </div>

        {/* Next Run */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Next Run</p>
          <p className="font-medium text-foreground">
            {status.isRunning ? 'In progress' : formatTimeUntil(status.nextRun)}
          </p>
          {status.nextRun && !status.isRunning && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatTimestamp(status.nextRun)}
            </p>
          )}
        </div>

        {/* Interval */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Interval</p>
          <p className="font-medium text-foreground">
            Every {status.config.intervalHours} hour{status.config.intervalHours > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {status.config.historyDepthDays} day history
          </p>
        </div>
      </div>

      {/* Last Run Details */}
      {status.lastRun && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tweets Fetched</p>
                <p className="font-medium text-foreground">{status.lastRun.tweetsFetched}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tweets Analyzed</p>
                <p className="font-medium text-foreground">{status.lastRun.tweetsAnalyzed}</p>
              </div>
              {status.lastRun.errorsCount > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                  <p className="font-medium text-destructive">{status.lastRun.errorsCount}</p>
                </div>
              )}
            </div>
            <StatusBadge status={status.lastRun.status} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <button
          onClick={onTrigger}
          disabled={status.isRunning || isTriggering}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTriggering ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isTriggering ? 'Starting...' : 'Run Now'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

// Force Re-Analyze Panel Component
function ForceReanalyzePanel({
  onOpenConfirmDialog,
  isReanalyzing,
  isDisabled
}: {
  onOpenConfirmDialog: () => void;
  isReanalyzing: boolean;
  isDisabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isReanalyzing ? 'bg-primary/10' : 'bg-muted'}`}>
            <RotateCcw className={`h-5 w-5 ${isReanalyzing ? 'text-primary animate-spin' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Force Re-Analyze</h2>
            <p className="text-sm text-muted-foreground">Re-run sentiment analysis on existing tweets</p>
          </div>
        </div>
        {isReanalyzing && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running
          </span>
        )}
      </div>

      {/* Description */}
      <div className="p-4 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Force re-analysis will re-process all stored tweets through the sentiment analysis pipeline.
          This is useful when you've changed LLM models or want to regenerate emotion scores.
        </p>
      </div>

      {/* Actions */}
      <div className="p-4">
        <button
          onClick={onOpenConfirmDialog}
          disabled={isDisabled || isReanalyzing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 text-amber-950 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isReanalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {isReanalyzing ? 'Re-analyzing...' : 'Force Re-Analyze All Tweets'}
        </button>
        {isDisabled && !isReanalyzing && (
          <p className="mt-2 text-xs text-muted-foreground">
            Cannot start re-analysis while crawler is running
          </p>
        )}
      </div>
    </div>
  );
}

// Recent Runs Table
function RecentRunsTable({ runs }: { runs: CrawlerRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Recent Runs</h3>
        <p className="text-muted-foreground text-center py-8">No crawler runs yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Runs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Started</th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Duration</th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Fetched</th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Analyzed</th>
              <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => {
              const startTime = new Date(run.startedAt);
              const endTime = run.completedAt ? new Date(run.completedAt) : null;
              const durationMs = endTime ? endTime.getTime() - startTime.getTime() : null;
              const durationStr = durationMs
                ? durationMs < 60000
                  ? `${Math.round(durationMs / 1000)}s`
                  : `${Math.round(durationMs / 60000)}m`
                : 'In progress';

              return (
                <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatTimestamp(run.startedAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                    {durationStr}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{run.tweetsFetched}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{run.tweetsAnalyzed}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [status, setStatus] = useState<CrawlerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [previousRunningState, setPreviousRunningState] = useState<boolean | null>(null);
  const [lastNotifiedRunId, setLastNotifiedRunId] = useState<number | null>(null);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  // Fetch crawler status
  const fetchStatus = async () => {
    try {
      const response = await api.get('/api/admin/crawler/status');

      if (!response.ok) {
        if (response.status === 401) {
          // Need to login - for now, auto-login
          await api.post('/api/admin/login', { username: 'admin', password: 'admin' });
          // Retry
          const retryResponse = await api.get('/api/admin/crawler/status');
          if (!retryResponse.ok) throw new Error('Failed to fetch status');
          const data = await retryResponse.json();
          setStatus(data);
          return;
        }
        throw new Error('Failed to fetch crawler status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Trigger crawler
  const triggerCrawler = async () => {
    setIsTriggering(true);
    try {
      const response = await api.post('/api/admin/crawler/trigger');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger crawler');
      }

      // Show confirmation toast
      showSuccess('Crawler started successfully');

      // Refresh status after triggering
      await fetchStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to trigger crawler';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsTriggering(false);
    }
  };

  // Trigger force re-analysis
  const triggerReanalyze = async () => {
    setIsReanalyzing(true);
    setError(null);
    try {
      const response = await api.post('/api/admin/reanalyze', { all: true });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger re-analysis');
      }

      const data = await response.json();
      console.log('Re-analysis started:', data);

      // Refresh status after triggering
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger re-analysis');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus();

    // Poll every 10 seconds when crawler is running
    const interval = setInterval(() => {
      if (status?.isRunning) {
        fetchStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [status?.isRunning]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Detect crawler completion and show notification
  useEffect(() => {
    if (!status) return;

    const currentRunning = status.isRunning;
    const lastRun = status.lastRun;

    // Check if crawler just transitioned from running to idle (completed)
    if (previousRunningState === true && currentRunning === false && lastRun) {
      // Only notify once per run (check run ID)
      if (lastNotifiedRunId !== lastRun.id) {
        setLastNotifiedRunId(lastRun.id);

        if (lastRun.status === 'completed') {
          showSuccess(
            `Crawler completed! Fetched ${lastRun.tweetsFetched} tweets, analyzed ${lastRun.tweetsAnalyzed}.`
          );
        } else if (lastRun.status === 'failed') {
          showError(
            `Crawler failed with ${lastRun.errorsCount} error${lastRun.errorsCount !== 1 ? 's' : ''}.`
          );
        }
      }
    }

    // Update previous state for next comparison
    setPreviousRunningState(currentRunning);
  }, [status, previousRunningState, lastNotifiedRunId, showSuccess, showError]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </p>
        </div>
      )}

      {/* Crawler Status Panel */}
      <CrawlerStatusPanel
        status={status}
        onTrigger={triggerCrawler}
        isTriggering={isTriggering}
      />

      {/* Force Re-Analyze Panel */}
      <ForceReanalyzePanel
        onOpenConfirmDialog={() => setShowReanalyzeConfirm(true)}
        isReanalyzing={isReanalyzing}
        isDisabled={status?.isRunning || false}
      />

      {/* Recent Runs */}
      {status && <RecentRunsTable runs={status.recentRuns} />}

      {/* Force Re-Analyze Confirmation Dialog */}
      <ConfirmDialog
        open={showReanalyzeConfirm}
        onOpenChange={setShowReanalyzeConfirm}
        title="Confirm Re-Analysis"
        description="Are you sure you want to re-analyze all tweets? This will re-process all stored tweets through the sentiment analysis pipeline. This operation may take a significant amount of time depending on the number of tweets."
        confirmLabel="Re-Analyze All"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowReanalyzeConfirm(false);
          triggerReanalyze();
        }}
        onCancel={() => setShowReanalyzeConfirm(false)}
        variant="warning"
      />
    </div>
  );
}
