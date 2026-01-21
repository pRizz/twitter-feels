// Admin Theme - Emotion colors and gauge label customization
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

// Types
interface EmotionConfig {
  [emotion: string]: {
    color: string;
  };
}

interface GaugeConfig {
  name: string;
  lowLabel: string;
  highLabel: string;
  emotions: string[];
  invertedEmotions?: string[];
}

interface ThemeSettings {
  emotions: EmotionConfig;
  gauges: GaugeConfig[];
}

// Default emotion display names (for UI)
const emotionDisplayNames: Record<string, string> = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  fearful: 'Fearful',
  hatred: 'Hatred',
  thankful: 'Thankful',
  excited: 'Excited',
  hopeful: 'Hopeful',
  frustrated: 'Frustrated',
  sarcastic: 'Sarcastic',
  inspirational: 'Inspirational',
  anxious: 'Anxious',
};

export default function AdminTheme() {
  const navigate = useNavigate();
  const { success: showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [emotions, setEmotions] = useState<EmotionConfig>({});
  const [gauges, setGauges] = useState<GaugeConfig[]>([]);

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    emotions: true,
    gauges: true,
  });

  const fetchThemeSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/theme', {
        credentials: 'include',
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch theme settings');
      }

      const data: ThemeSettings = await response.json();
      setEmotions(data.emotions);
      setGauges(data.gauges);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load theme settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemeSettings();
  }, [navigate]);

  const handleEmotionColorChange = (emotion: string, color: string) => {
    setEmotions((prev) => ({
      ...prev,
      [emotion]: { ...prev[emotion], color },
    }));
  };

  const handleGaugeLabelChange = (
    index: number,
    field: 'lowLabel' | 'highLabel' | 'name',
    value: string
  ) => {
    setGauges((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveEmotions = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emotions }),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save emotion colors');
      }

      showSuccess('Emotion colors saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save emotion colors');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGauges = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gauges }),
      });

      if (response.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save gauge settings');
      }

      showSuccess('Gauge settings saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gauge settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: 'emotions' | 'gauges') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Theme Settings</h1>
        <p className="text-muted-foreground">
          Customize emotion colors and gauge labels displayed across the dashboard
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

      {/* Emotion Colors Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('emotions')}
          className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-yellow-500 flex items-center justify-center">
              <span className="text-xl">🎨</span>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold">Emotion Colors</h2>
              <p className="text-sm text-muted-foreground">
                Customize colors for each emotion displayed in charts and visualizations
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 transition-transform ${expandedSections.emotions ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.emotions && (
          <div className="p-6 pt-0 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {Object.entries(emotions).map(([emotion, config]) => (
                <div
                  key={emotion}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="relative">
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) => handleEmotionColorChange(emotion, e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border"
                      style={{ backgroundColor: config.color }}
                      title={`Change ${emotionDisplayNames[emotion] || emotion} color`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {emotionDisplayNames[emotion] || emotion}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {config.color.toUpperCase()}
                    </div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full shadow-inner"
                    style={{ backgroundColor: config.color }}
                    title={`Preview: ${config.color}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveEmotions}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Emotion Colors'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gauge Configuration Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('gauges')}
          className="w-full flex items-center justify-between p-6 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold">Gauge Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Customize gauge names and low/high labels for the dashboard
              </p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 transition-transform ${expandedSections.gauges ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.gauges && (
          <div className="p-6 pt-0 border-t border-border">
            <div className="space-y-4 mb-6">
              {gauges.map((gauge, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Gauge Name */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Gauge Name
                      </label>
                      <input
                        type="text"
                        value={gauge.name}
                        onChange={(e) => handleGaugeLabelChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Low Label */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Low Label (0%)
                      </label>
                      <input
                        type="text"
                        value={gauge.lowLabel}
                        onChange={(e) => handleGaugeLabelChange(index, 'lowLabel', e.target.value)}
                        placeholder="e.g., Chill"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* High Label */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        High Label (100%)
                      </label>
                      <input
                        type="text"
                        value={gauge.highLabel}
                        onChange={(e) => handleGaugeLabelChange(index, 'highLabel', e.target.value)}
                        placeholder="e.g., Angry"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Mapped Emotions Display */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Mapped Emotions: </span>
                      {gauge.emotions.map((em, i) => (
                        <span key={em}>
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs mx-0.5"
                            style={{
                              backgroundColor: emotions[em]?.color + '20',
                              color: emotions[em]?.color,
                              border: `1px solid ${emotions[em]?.color}40`,
                            }}
                          >
                            {emotionDisplayNames[em] || em}
                          </span>
                          {i < gauge.emotions.length - 1 && ' '}
                        </span>
                      ))}
                      {gauge.invertedEmotions && gauge.invertedEmotions.length > 0 && (
                        <>
                          <span className="mx-2">|</span>
                          <span className="font-medium">Inverted: </span>
                          {gauge.invertedEmotions.map((em, i) => (
                            <span key={em}>
                              <span
                                className="inline-block px-2 py-0.5 rounded-full text-xs mx-0.5"
                                style={{
                                  backgroundColor: emotions[em]?.color + '20',
                                  color: emotions[em]?.color,
                                  border: `1px solid ${emotions[em]?.color}40`,
                                }}
                              >
                                -{emotionDisplayNames[em] || em}
                              </span>
                              {i < (gauge.invertedEmotions?.length || 0) - 1 && ' '}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveGauges}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Gauge Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-3">About Theme Customization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Emotion Colors</h4>
            <p>
              Each emotion tracked by the system has a configurable color. These colors are used
              throughout the dashboard in charts, gauges, and visualizations. Click on any color
              box to open the color picker.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Gauge Labels</h4>
            <p>
              Gauges aggregate multiple emotions into a single metric. The low label appears at 0%
              and the high label at 100%. For example, the Anger Gauge shows "Chill" when anger is
              low and "Angry" when anger is high.
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm">
            <span className="font-medium text-primary">Note:</span> Changes take effect immediately
            after saving. All users will see the updated colors and labels on their next page refresh.
          </p>
        </div>
      </div>
    </div>
  );
}
