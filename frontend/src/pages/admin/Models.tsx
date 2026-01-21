// Admin Models - LLM model management
import { useState, useEffect } from 'react';
import {
  Cpu,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  HardDrive,
  Heart,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

interface InstalledModel {
  id: number;
  name: string;
  version: string;
  provider: string;
  huggingfaceModelId: string | null;
  isLocal: boolean;
  isEnabled: boolean;
  downloadStatus: string;
  diskSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

interface DownloadProgress {
  modelId: number;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  status: 'downloading' | 'complete' | 'error';
}

interface AvailableModel {
  id: string;
  name: string;
  version: string;
  provider: string;
  description: string;
  downloads: number;
  likes: number;
  lastUpdated: string;
  estimatedSize: string;
  taskType: string;
}

interface ModelsResponse {
  installed: InstalledModel[];
  available: AvailableModel[];
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return 'Unknown';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function getStatusBadge(status: string, progress?: number) {
  switch (status) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
          <CheckCircle className="h-3 w-3" />
          Ready
        </span>
      );
    case 'downloading':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Downloading{progress !== undefined ? ` ${progress}%` : ''}
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
          <XCircle className="h-3 w-3" />
          Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">
          <AlertCircle className="h-3 w-3" />
          Not Downloaded
        </span>
      );
  }
}

export default function AdminModels() {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<number, DownloadProgress>>(new Map());

  useEffect(() => {
    fetchModels();
  }, []);

  // Poll for download progress
  useEffect(() => {
    if (downloadProgress.size === 0) return;

    const pollProgress = async () => {
      const newProgress = new Map(downloadProgress);
      let hasChanges = false;

      for (const [modelId, progress] of downloadProgress.entries()) {
        if (progress.status === 'complete') continue;

        try {
          const response = await api.get(`/api/admin/models/download/progress/${modelId}`);

          if (response.ok) {
            const data = await response.json();
            newProgress.set(modelId, {
              modelId: data.modelId,
              progress: data.progress,
              bytesDownloaded: data.bytesDownloaded,
              totalBytes: data.totalBytes,
              status: data.status,
            });
            hasChanges = true;

            // If download completed, refresh models list
            if (data.status === 'complete') {
              fetchModels();
              // Remove from downloadingModels set
              setDownloadingModels((prev) => {
                const next = new Set(prev);
                // Find the huggingface ID for this model
                const model = models?.installed.find((m) => m.id === modelId);
                if (model?.huggingfaceModelId) {
                  next.delete(model.huggingfaceModelId);
                }
                return next;
              });
            }
          }
        } catch (err) {
          console.error('Error polling progress:', err);
        }
      }

      if (hasChanges) {
        setDownloadProgress(newProgress);
      }
    };

    const interval = setInterval(pollProgress, 500);
    return () => clearInterval(interval);
  }, [downloadProgress, models]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/admin/models');

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (huggingfaceId: string) => {
    setDownloadingModels((prev) => new Set(prev).add(huggingfaceId));

    try {
      const response = await api.post('/api/admin/models/download', {
        modelId: huggingfaceId,
      });

      if (!response.ok) {
        throw new Error('Failed to start download');
      }

      const data = await response.json();
      const dbModelId = data.modelId;

      // Start tracking progress for this model
      setDownloadProgress((prev) => {
        const next = new Map(prev);
        next.set(dbModelId, {
          modelId: dbModelId,
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          status: 'downloading',
        });
        return next;
      });

      // Refresh models list after download starts
      await fetchModels();
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadingModels((prev) => {
        const next = new Set(prev);
        next.delete(huggingfaceId);
        return next;
      });
    }
    // Note: We don't remove from downloadingModels here - that happens when progress reaches complete
  };

  const handleToggleEnabled = async (modelId: number, currentEnabled: boolean) => {
    try {
      const response = await api.put(`/api/admin/models/${modelId}`, {
        enabled: !currentEnabled,
      });

      if (!response.ok) {
        throw new Error('Failed to toggle model');
      }

      // Refresh models list
      await fetchModels();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="p-4 bg-destructive/10 text-destructive rounded-lg">
        <p>Error: {error}</p>
        <button
          onClick={fetchModels}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">LLM Models</h1>
        <p className="text-muted-foreground">
          Manage language models for sentiment analysis
        </p>
      </div>

      {/* Installed Models Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          Installed Models
        </h2>

        {models?.installed.length === 0 ? (
          <div className="p-6 bg-card rounded-lg border border-border text-center">
            <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No models installed yet. Browse available models below to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {models?.installed.map((model) => {
              const progress = downloadProgress.get(model.id);
              const isDownloading = model.downloadStatus === 'downloading' || progress?.status === 'downloading';
              const progressPercent = progress?.progress ?? 0;

              return (
                <div
                  key={model.id}
                  className="p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg font-mono">{model.name}</h3>
                        <span className="text-sm text-muted-foreground font-mono">
                          v{model.version}
                        </span>
                        {getStatusBadge(model.downloadStatus, isDownloading ? progressPercent : undefined)}
                      </div>

                      {/* Progress bar for downloading models */}
                      {isDownloading && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Downloading...</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          {progress && progress.totalBytes > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="capitalize">{model.provider}</span>
                        </span>
                        {model.diskSizeBytes && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-4 w-4" />
                            {formatBytes(model.diskSizeBytes)}
                          </span>
                        )}
                        {model.huggingfaceModelId && (
                          <a
                            href={`https://huggingface.co/${model.huggingfaceModelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View on Hugging Face
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {model.downloadStatus === 'ready' && (
                        <button
                          onClick={() => handleToggleEnabled(model.id, model.isEnabled)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            model.isEnabled
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                          }`}
                        >
                          {model.isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                      {(model.downloadStatus === 'error' || model.downloadStatus === 'not_downloaded') && model.huggingfaceModelId && (
                        <button
                          onClick={() => handleDownload(model.huggingfaceModelId!)}
                          disabled={downloadingModels.has(model.huggingfaceModelId)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {downloadingModels.has(model.huggingfaceModelId) ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Retry Download
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available Models Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Available Models
        </h2>

        <p className="text-sm text-muted-foreground mb-4">
          Browse and download models from Hugging Face for sentiment analysis
        </p>

        {models?.available.length === 0 ? (
          <div className="p-6 bg-card rounded-lg border border-border text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">
              All recommended models are already installed!
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {models?.available.map((model) => (
              <div
                key={model.id}
                className="p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg font-mono">{model.name}</h3>
                      <span className="text-sm text-muted-foreground font-mono">
                        v{model.version}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                        {model.taskType}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {model.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {formatNumber(model.downloads)} downloads
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {formatNumber(model.likes)} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        ~{model.estimatedSize}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Updated {model.lastUpdated}
                      </span>
                      <a
                        href={`https://huggingface.co/${model.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Hugging Face
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(model.id)}
                    disabled={downloadingModels.has(model.id)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {downloadingModels.has(model.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
