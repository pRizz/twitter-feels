// Admin Settings - Crawler and S3 backup configuration
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

interface CrawlerSettings {
  intervalHours: number;
  historyDepthDays: number;
  rateLimitPer15Min: number;
}

interface BackupSettings {
  enabled: boolean;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKeySet: boolean;
  schedule: string;
  retentionDays: number;
}

interface Settings {
  crawler: CrawlerSettings;
  backup: BackupSettings;
}

// AWS Regions for S3
const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-west-2', label: 'EU (London)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
];

// Backup schedule options
const SCHEDULE_OPTIONS = [
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'manual', label: 'Manual Only' },
];

// Default values for crawler settings
const DEFAULT_CRAWLER_SETTINGS = {
  intervalHours: 1,
  historyDepthDays: 90,
  rateLimitPer15Min: 450,
};

// Default values for backup settings
const DEFAULT_BACKUP_SETTINGS = {
  enabled: false,
  bucketName: '',
  region: 'us-east-1',
  accessKeyId: '',
  secretAccessKey: '',
  schedule: 'daily',
  retentionDays: 30,
};

export default function AdminSettings() {
  const navigate = useNavigate();
  const { success: showSuccess } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for S3 backup
  const [backupForm, setBackupForm] = useState({
    enabled: false,
    bucketName: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    schedule: 'daily',
    retentionDays: 30,
  });

  // Form state for crawler
  const [crawlerForm, setCrawlerForm] = useState({
    intervalHours: 1,
    historyDepthDays: 90,
    rateLimitPer15Min: 450,
  });

  // Validation error state for crawler form
  const [crawlerErrors, setCrawlerErrors] = useState<{
    intervalHours?: string;
    historyDepthDays?: string;
    rateLimitPer15Min?: string;
  }>({});

  // Validation error state for backup form
  const [backupErrors, setBackupErrors] = useState<{
    bucketName?: string;
    retentionDays?: string;
  }>({});

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Track initial values for dirty state detection
  const [initialCrawlerForm, setInitialCrawlerForm] = useState({
    intervalHours: 1,
    historyDepthDays: 90,
    rateLimitPer15Min: 450,
  });

  const [initialBackupForm, setInitialBackupForm] = useState({
    enabled: false,
    bucketName: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    schedule: 'daily',
    retentionDays: 30,
  });

  // Calculate if forms have been modified (dirty state)
  const isCrawlerDirty = useMemo(() => {
    return (
      crawlerForm.intervalHours !== initialCrawlerForm.intervalHours ||
      crawlerForm.historyDepthDays !== initialCrawlerForm.historyDepthDays ||
      crawlerForm.rateLimitPer15Min !== initialCrawlerForm.rateLimitPer15Min
    );
  }, [crawlerForm, initialCrawlerForm]);

  const isBackupDirty = useMemo(() => {
    return (
      backupForm.enabled !== initialBackupForm.enabled ||
      backupForm.bucketName !== initialBackupForm.bucketName ||
      backupForm.region !== initialBackupForm.region ||
      backupForm.accessKeyId !== initialBackupForm.accessKeyId ||
      backupForm.secretAccessKey !== initialBackupForm.secretAccessKey ||
      backupForm.schedule !== initialBackupForm.schedule ||
      backupForm.retentionDays !== initialBackupForm.retentionDays
    );
  }, [backupForm, initialBackupForm]);

  const isFormDirty = isCrawlerDirty || isBackupDirty;

  // Hook for unsaved changes warning
  const { showWarning, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning({
    isDirty: isFormDirty,
    message: 'You have unsaved changes to your settings. Are you sure you want to leave?',
  });

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/settings', {
        credentials: 'include',
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data: Settings = await response.json();
      setSettings(data);

      // Initialize form state and track initial values for dirty detection
      const crawlerValues = {
        intervalHours: data.crawler.intervalHours,
        historyDepthDays: data.crawler.historyDepthDays,
        rateLimitPer15Min: data.crawler.rateLimitPer15Min,
      };
      setCrawlerForm(crawlerValues);
      setInitialCrawlerForm(crawlerValues);

      const backupValues = {
        enabled: data.backup.enabled,
        bucketName: data.backup.bucketName,
        region: data.backup.region,
        accessKeyId: data.backup.accessKeyId,
        secretAccessKey: '', // Never pre-fill secret
        schedule: data.backup.schedule,
        retentionDays: data.backup.retentionDays,
      };
      setBackupForm(backupValues);
      setInitialBackupForm(backupValues);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [navigate]);

  // Validate crawler form and return errors
  const validateCrawlerForm = (): boolean => {
    const errors: typeof crawlerErrors = {};
    let isValid = true;

    // Validate interval hours
    if (crawlerForm.intervalHours < 1 || crawlerForm.intervalHours > 168) {
      errors.intervalHours = 'Must be between 1 and 168 hours';
      isValid = false;
    }

    // Validate history depth
    if (crawlerForm.historyDepthDays < 1 || crawlerForm.historyDepthDays > 365) {
      errors.historyDepthDays = 'Must be between 1 and 365 days';
      isValid = false;
    }

    // Validate rate limit
    if (crawlerForm.rateLimitPer15Min < 1 || crawlerForm.rateLimitPer15Min > 900) {
      errors.rateLimitPer15Min = 'Must be between 1 and 900';
      isValid = false;
    }

    setCrawlerErrors(errors);
    return isValid;
  };

  // Validate S3 bucket name according to AWS naming rules
  const validateBucketName = (name: string): string | undefined => {
    if (!name || name.trim() === '') {
      return 'Bucket name is required';
    }

    const trimmedName = name.trim();

    // Length check: 3-63 characters
    if (trimmedName.length < 3) {
      return 'Bucket name must be at least 3 characters';
    }
    if (trimmedName.length > 63) {
      return 'Bucket name must be at most 63 characters';
    }

    // Must start with a lowercase letter or number
    if (!/^[a-z0-9]/.test(trimmedName)) {
      return 'Bucket name must start with a lowercase letter or number';
    }

    // Must end with a lowercase letter or number
    if (!/[a-z0-9]$/.test(trimmedName)) {
      return 'Bucket name must end with a lowercase letter or number';
    }

    // Can only contain lowercase letters, numbers, hyphens, and periods
    if (!/^[a-z0-9.-]+$/.test(trimmedName)) {
      return 'Bucket name can only contain lowercase letters, numbers, hyphens, and periods';
    }

    // Cannot contain consecutive periods
    if (/\.\./.test(trimmedName)) {
      return 'Bucket name cannot contain consecutive periods';
    }

    // Cannot be formatted as an IP address (e.g., 192.168.1.1)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmedName)) {
      return 'Bucket name cannot be formatted as an IP address';
    }

    return undefined; // Valid
  };

  // Validate backup form and return errors
  const validateBackupForm = (): boolean => {
    const errors: typeof backupErrors = {};
    let isValid = true;

    // Only validate if backup is enabled
    if (backupForm.enabled) {
      // Validate bucket name
      const bucketError = validateBucketName(backupForm.bucketName);
      if (bucketError) {
        errors.bucketName = bucketError;
        isValid = false;
      }

      // Validate retention days
      if (backupForm.retentionDays < 1 || backupForm.retentionDays > 365) {
        errors.retentionDays = 'Must be between 1 and 365 days';
        isValid = false;
      }
    }

    setBackupErrors(errors);
    return isValid;
  };

  // Validate password complexity
  const validatePasswordComplexity = (password: string): string[] => {
    const errors: string[] = [];

    // Minimum 12 characters
    if (password.length < 12) {
      errors.push('Must be at least 12 characters');
    }

    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain an uppercase letter');
    }

    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Must contain a lowercase letter');
    }

    // Must contain at least one number
    if (!/[0-9]/.test(password)) {
      errors.push('Must contain a number');
    }

    // Must contain at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Must contain a special character');
    }

    return errors;
  };

  // Validate password form and return errors
  const validatePasswordForm = (): boolean => {
    const errors: typeof passwordErrors = {};
    let isValid = true;

    // Validate current password (required)
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    // Validate new password complexity
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else {
      const complexityErrors = validatePasswordComplexity(passwordForm.newPassword);
      if (complexityErrors.length > 0) {
        errors.newPassword = complexityErrors.join(', ');
        isValid = false;
      }
    }

    // Validate password confirmation
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
      isValid = false;
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setPasswordErrors(errors);
    return isValid;
  };

  // Handle password change submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate form before submitting
    if (!validatePasswordForm()) {
      return; // Form is invalid, don't submit
    }

    setPasswordSaving(true);

    try {
      const response = await fetch('http://localhost:3001/api/admin/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordForm),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      // Success - reset form and show message
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveCrawler = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form before submitting
    if (!validateCrawlerForm()) {
      return; // Form is invalid, don't submit
    }

    setSaving(true);

    try {
      const response = await fetch('http://localhost:3001/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ crawler: crawlerForm }),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save crawler settings');
      }

      // Reset initial values to current values (form is now "clean")
      setInitialCrawlerForm({ ...crawlerForm });
      showSuccess('Crawler settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form before submitting
    if (!validateBackupForm()) {
      return; // Form is invalid, don't submit
    }

    setSaving(true);

    try {
      const payload = {
        backup: {
          enabled: backupForm.enabled,
          bucketName: backupForm.bucketName,
          region: backupForm.region,
          accessKeyId: backupForm.accessKeyId,
          // Only send secret if it was changed
          ...(backupForm.secretAccessKey && { secretAccessKey: backupForm.secretAccessKey }),
          schedule: backupForm.schedule,
          retentionDays: backupForm.retentionDays,
        },
      };

      const response = await fetch('http://localhost:3001/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save backup settings');
      }

      showSuccess('S3 backup settings saved successfully!');
      setBackupForm(prev => ({ ...prev, secretAccessKey: '' })); // Clear secret after save
      await fetchSettings(); // Refresh to get updated secretAccessKeySet status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset crawler settings to defaults
  const handleResetCrawler = () => {
    setCrawlerForm({ ...DEFAULT_CRAWLER_SETTINGS });
    setCrawlerErrors({});
    setError(null);
  };

  // Reset backup settings to defaults
  const handleResetBackup = () => {
    setBackupForm({ ...DEFAULT_BACKUP_SETTINGS });
    setBackupErrors({});
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Unsaved Changes Warning Dialog */}
      <ConfirmDialog
        open={showWarning}
        onOpenChange={(open) => {
          if (!open) cancelNavigation();
        }}
        title="Unsaved Changes"
        description="You have unsaved changes to your settings. If you leave this page, your changes will be lost."
        confirmLabel="Leave Page"
        cancelLabel="Stay on Page"
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        variant="warning"
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure crawler behavior and S3 backup settings
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Crawler Settings Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-xl">🕷️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Crawler Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure how often and how much data the crawler fetches
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCrawler} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Crawl Interval (hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={crawlerForm.intervalHours}
                onChange={(e) => {
                  setCrawlerForm({ ...crawlerForm, intervalHours: parseInt(e.target.value) || 0 });
                  setCrawlerErrors({ ...crawlerErrors, intervalHours: undefined });
                }}
                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  crawlerErrors.intervalHours ? 'border-destructive' : 'border-border'
                }`}
              />
              {crawlerErrors.intervalHours ? (
                <p className="text-xs text-destructive mt-1">
                  {crawlerErrors.intervalHours}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  How often to fetch new tweets (1-168 hours)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                History Depth (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={crawlerForm.historyDepthDays}
                onChange={(e) => {
                  setCrawlerForm({ ...crawlerForm, historyDepthDays: parseInt(e.target.value) || 0 });
                  setCrawlerErrors({ ...crawlerErrors, historyDepthDays: undefined });
                }}
                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  crawlerErrors.historyDepthDays ? 'border-destructive' : 'border-border'
                }`}
              />
              {crawlerErrors.historyDepthDays ? (
                <p className="text-xs text-destructive mt-1">
                  {crawlerErrors.historyDepthDays}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  How far back to fetch tweets (1-365 days)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Rate Limit (per 15 min)
              </label>
              <input
                type="number"
                min="1"
                max="900"
                value={crawlerForm.rateLimitPer15Min}
                onChange={(e) => {
                  setCrawlerForm({ ...crawlerForm, rateLimitPer15Min: parseInt(e.target.value) || 0 });
                  setCrawlerErrors({ ...crawlerErrors, rateLimitPer15Min: undefined });
                }}
                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  crawlerErrors.rateLimitPer15Min ? 'border-destructive' : 'border-border'
                }`}
              />
              {crawlerErrors.rateLimitPer15Min ? (
                <p className="text-xs text-destructive mt-1">
                  {crawlerErrors.rateLimitPer15Min}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Twitter API requests allowed per 15 minutes
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleResetCrawler}
              disabled={saving}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Crawler Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* S3 Backup Settings Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <span className="text-xl">☁️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">S3 Backup Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure automatic database backups to Amazon S3
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveBackup} className="space-y-6">
          {/* Enable Backup Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="font-medium">Enable S3 Backups</div>
              <div className="text-sm text-muted-foreground">
                Automatically backup your database to Amazon S3
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={backupForm.enabled}
                onChange={(e) => setBackupForm({ ...backupForm, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* S3 Configuration Fields */}
          <div className={`space-y-4 ${!backupForm.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Bucket Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                S3 Bucket Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={backupForm.bucketName}
                onChange={(e) => {
                  setBackupForm({ ...backupForm, bucketName: e.target.value });
                  setBackupErrors({ ...backupErrors, bucketName: undefined });
                }}
                placeholder="my-twitter-feels-backups"
                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  backupErrors.bucketName ? 'border-destructive' : 'border-border'
                }`}
                disabled={!backupForm.enabled}
              />
              {backupErrors.bucketName ? (
                <p className="text-xs text-destructive mt-1">
                  {backupErrors.bucketName}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  The name of your S3 bucket (must already exist)
                </p>
              )}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium mb-1">
                AWS Region <span className="text-destructive">*</span>
              </label>
              <select
                value={backupForm.region}
                onChange={(e) => setBackupForm({ ...backupForm, region: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!backupForm.enabled}
              >
                {AWS_REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label} ({region.value})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                The AWS region where your S3 bucket is located
              </p>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  AWS Access Key ID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={backupForm.accessKeyId}
                  onChange={(e) => setBackupForm({ ...backupForm, accessKeyId: e.target.value })}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  disabled={!backupForm.enabled}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  AWS Secret Access Key <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  value={backupForm.secretAccessKey}
                  onChange={(e) => setBackupForm({ ...backupForm, secretAccessKey: e.target.value })}
                  placeholder={settings?.backup.secretAccessKeySet ? '••••••••••••••••' : 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  disabled={!backupForm.enabled}
                />
                {settings?.backup.secretAccessKeySet && (
                  <p className="text-xs text-green-500 mt-1">
                    Secret key is configured. Leave blank to keep current value.
                  </p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Backup Schedule
                </label>
                <select
                  value={backupForm.schedule}
                  onChange={(e) => setBackupForm({ ...backupForm, schedule: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!backupForm.enabled}
                >
                  {SCHEDULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  How often to automatically backup the database
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Retention Period (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={backupForm.retentionDays}
                  onChange={(e) =>
                    setBackupForm({ ...backupForm, retentionDays: parseInt(e.target.value) || 30 })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!backupForm.enabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How long to keep old backups (1-365 days)
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 text-xl">⚠️</span>
                <div className="text-sm">
                  <div className="font-medium text-yellow-500 mb-1">Security Notice</div>
                  <p className="text-muted-foreground">
                    AWS credentials are stored encrypted in the database. For production use, consider using
                    IAM roles or environment variables instead of storing credentials directly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleResetBackup}
              disabled={saving}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Backup Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <span className="text-xl">🔐</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-sm text-muted-foreground">
              Update your admin account password
            </p>
          </div>
        </div>

        {/* Password Success Message */}
        {passwordSuccess && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
            {passwordSuccess}
          </div>
        )}

        {/* Password Error Message */}
        {passwordError && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {passwordError}
            <button
              onClick={() => setPasswordError(null)}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Current Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => {
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
              }}
              placeholder="Enter your current password"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                passwordErrors.currentPassword ? 'border-destructive' : 'border-border'
              }`}
            />
            {passwordErrors.currentPassword && (
              <p className="text-xs text-destructive mt-1">
                {passwordErrors.currentPassword}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              New Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => {
                setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                setPasswordErrors({ ...passwordErrors, newPassword: undefined });
              }}
              placeholder="Enter your new password"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                passwordErrors.newPassword ? 'border-destructive' : 'border-border'
              }`}
            />
            {passwordErrors.newPassword ? (
              <p className="text-xs text-destructive mt-1">
                {passwordErrors.newPassword}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 12 characters with uppercase, lowercase, number, and special character
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm New Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => {
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
              }}
              placeholder="Confirm your new password"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                passwordErrors.confirmPassword ? 'border-destructive' : 'border-border'
              }`}
            />
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">
                {passwordErrors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {passwordSaving ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-3">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-1">Setting up S3 Backups</h4>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Create an S3 bucket in your AWS account</li>
              <li>Create an IAM user with S3 access permissions</li>
              <li>Generate access keys for the IAM user</li>
              <li>Enter the bucket name and credentials above</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium mb-1">Recommended IAM Policy</h4>
            <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto">
{`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::your-bucket/*",
      "arn:aws:s3:::your-bucket"
    ]
  }]
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
