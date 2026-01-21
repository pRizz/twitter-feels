// Dashboard page - Main public dashboard with gauges, leaderboards, and user grid
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

// Types for dashboard data
interface GaugeData {
  name: string;
  value: number;
  lowLabel: string;
  highLabel: string;
  color: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
}

interface LeaderboardData {
  emotion: string;
  highest: LeaderboardEntry[];
  lowest: LeaderboardEntry[];
}

interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  topEmotion: string;
  topEmotionScore: number;
}

interface DashboardData {
  lastUpdated: string;
  gauges: GaugeData[];
  leaderboards: LeaderboardData[];
  users: UserSummary[];
  stats: {
    totalUsers: number;
    totalTweets: number;
    totalAnalyses: number;
  };
  filteredAnalysisCount?: number;
  timeBucket?: string;
  timeCutoff?: string;
}

// Helper function to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 * percent / 100));
    return Math.max(0, Math.min(255, adjusted));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Gauge component
function Gauge({ name, value, lowLabel, highLabel, color }: GaugeData) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Create gradient colors: lighter on left edge, main color, darker on right
  const lighterColor = adjustBrightness(color, 25);
  const darkerColor = adjustBrightness(color, -15);

  return (
    <div className="bg-card rounded-lg p-4 shadow-card border border-border">
      <h3 className="text-lg font-semibold mb-2 text-foreground">{name}</h3>
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${animatedValue}%`,
            background: `linear-gradient(90deg, ${lighterColor} 0%, ${color} 50%, ${darkerColor} 100%)`,
            boxShadow: `0 0 12px ${color}50, inset 0 1px 1px ${lighterColor}40`,
          }}
        />
        {/* Subtle highlight overlay for 3D effect */}
        <div
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none transition-all duration-1000 ease-out"
          style={{
            width: `${animatedValue}%`,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground drop-shadow-md">
            {Math.round(animatedValue)}
          </span>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// Leaderboard component
function Leaderboard({ data }: { data: LeaderboardData }) {
  return (
    <div className="bg-card rounded-lg p-4 shadow-card border border-border">
      <h3 className="text-lg font-semibold mb-3 text-foreground capitalize">
        {data.emotion} Leaderboard
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-primary mb-2">Highest</h4>
          <ul className="space-y-2">
            {data.highest.length > 0 ? (
              data.highest.slice(0, 3).map((entry, index) => (
                <li key={entry.userId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={`${entry.displayName || entry.username}'s avatar`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary-cyan/20" />
                    )}
                  </div>
                  <span className="text-sm text-foreground truncate flex-1">
                    {entry.displayName || entry.username}
                  </span>
                  <span className="text-xs font-mono text-primary">{entry.score}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No data yet</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-primary-violet mb-2">Lowest</h4>
          <ul className="space-y-2">
            {data.lowest.length > 0 ? (
              data.lowest.slice(0, 3).map((entry, index) => (
                <li key={entry.userId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={`${entry.displayName || entry.username}'s avatar`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary-violet/20" />
                    )}
                  </div>
                  <span className="text-sm text-foreground truncate flex-1">
                    {entry.displayName || entry.username}
                  </span>
                  <span className="text-xs font-mono text-primary-violet">{entry.score}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No data yet</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// User card component
function UserCard({ user }: { user: UserSummary }) {
  return (
    <Link
      to={`/users/${user.id}`}
      className="bg-card rounded-lg p-4 shadow-md border border-border hover:border-primary-cyan/50 hover:shadow-glow-sm transition-all duration-200 block"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`${user.displayName || user.username}'s avatar`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-cyan/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {user.displayName?.[0] || user.username[0]}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{user.displayName}</h3>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
        </div>
      </div>
      {user.bio && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Top emotion</span>
        <span className="text-sm font-medium text-primary capitalize">
          {user.topEmotion}: {user.topEmotionScore}
        </span>
      </div>
    </Link>
  );
}

// Helper function to format date range based on time period
function formatDateRange(timeCutoff: string | undefined, timeBucket: string | undefined): string | null {
  if (!timeCutoff || timeBucket === 'all_time') {
    return null;
  }

  const startDate = new Date(timeCutoff);
  const endDate = new Date(); // Current date

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  const startStr = startDate.toLocaleDateString(undefined, formatOptions);
  const endStr = endDate.toLocaleDateString(undefined, formatOptions);

  return `${startStr} - ${endStr}`;
}

// Time period selector
function TimePeriodSelector({
  value,
  onChange,
  dateRange,
}: {
  value: string;
  onChange: (value: string) => void;
  dateRange?: string | null;
}) {
  const periods = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'all_time', label: 'All Time' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Time:</span>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={`px-3 py-1.5 text-sm transition-colors ${
              value === period.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
      {dateRange && (
        <span className="text-xs text-muted-foreground ml-1">
          ({dateRange})
        </span>
      )}
    </div>
  );
}

// Model filter selector
function ModelFilter({
  value,
  onChange,
  models,
}: {
  value: string;
  onChange: (value: string) => void;
  models: { id: string; name: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="model-filter" className="text-sm text-muted-foreground">Model:</label>
      <select
        id="model-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-cyan/50"
      >
        <option value="combined">Combined</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Default gauges from spec
const DEFAULT_GAUGES: GaugeData[] = [
  { name: 'Anger Gauge', value: 35, lowLabel: 'Chill', highLabel: 'Angry', color: '#FF4444' },
  { name: 'Inspiration Gauge', value: 62, lowLabel: 'Doomer', highLabel: 'Kurzweilian', color: '#00CED1' },
  { name: 'Gratitude Gauge', value: 48, lowLabel: 'Entitled', highLabel: 'Thankful', color: '#32CD32' },
  { name: 'Mood Gauge', value: 55, lowLabel: 'Gloomy', highLabel: 'Joyful', color: '#FFD700' },
  { name: 'Intensity Gauge', value: 42, lowLabel: 'Zen', highLabel: 'Heated', color: '#FF6B35' },
  { name: 'Playfulness Gauge', value: 58, lowLabel: 'Serious', highLabel: 'Comedian', color: '#BA55D3' },
];

interface LLMModel {
  id: string;
  name: string;
  provider: string;
}

// Sort selector component
function SortSelector({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: {
  sortBy: string;
  sortOrder: string;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-by" className="text-sm text-muted-foreground">Sort:</label>
      <select
        id="sort-by"
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-cyan/50"
      >
        <option value="followers">Followers</option>
        <option value="name">Name</option>
        <option value="score">Emotion Score</option>
      </select>
      <button
        onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="p-1.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
        title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
        aria-label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
      >
        {sortOrder === 'asc' ? (
          <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Valid values for filters
const VALID_TIME_PERIODS = ['weekly', 'monthly', 'yearly', 'all_time'];
const VALID_SORT_BY = ['followers', 'name', 'score'];
const VALID_SORT_ORDER = ['asc', 'desc'];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial values from URL params, falling back to defaults
  const getInitialTimePeriod = () => {
    const param = searchParams.get('period');
    return param && VALID_TIME_PERIODS.includes(param) ? param : 'weekly';
  };

  const getInitialModelFilter = () => {
    const param = searchParams.get('model');
    return param || 'combined';
  };

  const getInitialSortBy = () => {
    const param = searchParams.get('sortBy');
    return param && VALID_SORT_BY.includes(param) ? param : 'followers';
  };

  const getInitialSortOrder = () => {
    const param = searchParams.get('sortOrder');
    return param && VALID_SORT_ORDER.includes(param) ? param : 'desc';
  };

  const [timePeriod, setTimePeriodState] = useState(getInitialTimePeriod);
  const [modelFilter, setModelFilterState] = useState(getInitialModelFilter);
  const [sortBy, setSortByState] = useState(getInitialSortBy);
  const [sortOrder, setSortOrderState] = useState(getInitialSortOrder);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Update URL params when filter values change
  const updateSearchParams = useCallback(
    (newParams: { period?: string; model?: string; sortBy?: string; sortOrder?: string }) => {
      const updatedParams = new URLSearchParams(searchParams);

      if (newParams.period !== undefined) {
        if (newParams.period === 'weekly') {
          updatedParams.delete('period');
        } else {
          updatedParams.set('period', newParams.period);
        }
      }
      if (newParams.model !== undefined) {
        if (newParams.model === 'combined') {
          updatedParams.delete('model');
        } else {
          updatedParams.set('model', newParams.model);
        }
      }
      if (newParams.sortBy !== undefined) {
        if (newParams.sortBy === 'followers') {
          updatedParams.delete('sortBy');
        } else {
          updatedParams.set('sortBy', newParams.sortBy);
        }
      }
      if (newParams.sortOrder !== undefined) {
        if (newParams.sortOrder === 'desc') {
          updatedParams.delete('sortOrder');
        } else {
          updatedParams.set('sortOrder', newParams.sortOrder);
        }
      }

      setSearchParams(updatedParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Wrapper functions to update both state and URL
  const setTimePeriod = useCallback(
    (value: string) => {
      setTimePeriodState(value);
      updateSearchParams({ period: value });
    },
    [updateSearchParams]
  );

  const setModelFilter = useCallback(
    (value: string) => {
      setModelFilterState(value);
      updateSearchParams({ model: value });
    },
    [updateSearchParams]
  );

  const setSortBy = useCallback(
    (value: string) => {
      setSortByState(value);
      updateSearchParams({ sortBy: value });
    },
    [updateSearchParams]
  );

  const setSortOrder = useCallback(
    (value: string) => {
      setSortOrderState(value);
      updateSearchParams({ sortOrder: value });
    },
    [updateSearchParams]
  );

  // Clear all filters and reset to defaults
  const clearAllFilters = useCallback(() => {
    // Reset state to defaults
    setTimePeriodState('weekly');
    setModelFilterState('combined');
    setSortByState('followers');
    setSortOrderState('desc');
    setUserSearchQuery('');
    // Clear all URL parameters (defaults are not stored in URL)
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Check if any filters are active (non-default values)
  // Use trim() for search query to treat whitespace-only as empty (not an active filter)
  const hasActiveFilters =
    timePeriod !== 'weekly' ||
    modelFilter !== 'combined' ||
    sortBy !== 'followers' ||
    sortOrder !== 'desc' ||
    userSearchQuery.trim() !== '';

  // Fetch available models once on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/models');
        if (response.ok) {
          const modelsData = await response.json();
          setModels(modelsData.models || []);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // Check URL for delay param (used for testing loading states)
        const urlParams = new URLSearchParams(window.location.search);
        const testDelay = urlParams.get('testDelay') || '';
        const delayParam = testDelay ? `&delay=${testDelay}` : '';
        const response = await fetch(
          `http://localhost:3001/api/dashboard?timeBucket=${timePeriod}&modelId=${modelFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}${delayParam}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const dashboardData = await response.json();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Failed to load dashboard data');
        // Use default/sample data for display
        setData({
          lastUpdated: new Date().toISOString(),
          gauges: DEFAULT_GAUGES,
          leaderboards: [
            {
              emotion: 'happiness',
              highest: [],
              lowest: [],
            },
          ],
          users: [],
          stats: { totalUsers: 0, totalTweets: 0, totalAnalyses: 0 },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [timePeriod, modelFilter, sortBy, sortOrder]);

  const gauges = data?.gauges?.length ? data.gauges : DEFAULT_GAUGES;
  const leaderboards = data?.leaderboards || [];
  const users = data?.users || [];

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Twitter Feels Dashboard</h1>
        <div className="flex flex-wrap items-center gap-4">
          <TimePeriodSelector
            value={timePeriod}
            onChange={setTimePeriod}
            dateRange={formatDateRange(data?.timeCutoff, data?.timeBucket)}
          />
          <ModelFilter
            value={modelFilter}
            onChange={setModelFilter}
            models={models}
          />
          <SortSelector
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={setSortBy}
            onSortOrderChange={setSortOrder}
          />
          {/* Clear Filters button - only visible when filters are active */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border transition-colors flex items-center gap-1.5"
              title="Reset all filters to default values"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error message with retry option */}
      {error && (
        <div role="alert" className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-error">{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                fetch(`http://localhost:3001/api/dashboard?timeBucket=${timePeriod}&modelId=${modelFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`)
                  .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch');
                    return res.json();
                  })
                  .then(dashboardData => {
                    setData(dashboardData);
                    setError(null);
                  })
                  .catch(() => setError('Failed to load dashboard data. Please try again.'))
                  .finally(() => setIsLoading(false));
              }}
              className="px-3 py-1.5 text-sm bg-error/20 hover:bg-error/30 text-error rounded-md transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Unable to connect to the server. Please check your connection and try again.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status" aria-label="Loading dashboard data">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-cyan"></div>
          <span className="sr-only">Loading...</span>
        </div>
      )}

      {/* Empty state message when no data matches current filters */}
      {!isLoading && !error && data && data.filteredAnalysisCount === 0 && (
        <div className="mb-6 p-4 bg-primary-cyan/10 border border-primary-cyan/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-primary font-medium">No sentiment data for selected filters</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.stats.totalAnalyses > 0 ? (
              <>
                There are {data.stats.totalAnalyses} analyses in the database, but none match the current time period
                {modelFilter !== 'combined' && ' or model filter'}. Try selecting "All Time" or a different model to see data.
              </>
            ) : (
              <>
                No tweets have been analyzed yet. The crawler needs to fetch tweets and run sentiment analysis.
                Visit the <a href="/admin/login" className="text-primary hover:underline">admin dashboard</a> to check crawler status.
              </>
            )}
          </p>
        </div>
      )}

      {/* Content sections - hidden during loading */}
      {!isLoading && (
        <>
          {/* Average Twitter Feel Section - Gauges */}
          <section className="mb-10 animate-slide-up">
            <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="text-primary">⚡</span>
              Average Twitter Feel
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gauges.map((gauge) => (
                <Gauge key={gauge.name} {...gauge} />
              ))}
            </div>
          </section>

          {/* Leaderboards Section */}
          <section className="mb-10" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="text-primary-violet">🏆</span>
              Emotion Leaderboards
            </h2>
            {leaderboards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {leaderboards.map((board) => (
                  <Leaderboard key={board.emotion} data={board} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-lg p-8 border border-border text-center">
                <p className="text-muted-foreground">
                  No leaderboard data available yet. Start tracking Twitter users to see rankings!
                </p>
              </div>
            )}
          </section>

          {/* Tracked Influencers Grid */}
          <section style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <span className="text-primary">👥</span>
                Tracked Influencers
              </h2>
              {/* User search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  maxLength={200}
                  className="w-full sm:w-64 px-4 py-2 pl-10 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-cyan/50 focus:border-primary-cyan"
                  aria-label="Search users by name or handle"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            {(() => {
              // Filter users based on search query (case-insensitive)
              const searchLower = userSearchQuery.toLowerCase().trim();
              const filteredUsers = users.filter((user) => {
                if (!searchLower) return true;
                const displayNameMatch = user.displayName?.toLowerCase().includes(searchLower);
                const usernameMatch = user.username?.toLowerCase().includes(searchLower);
                const handleMatch = `@${user.username}`.toLowerCase().includes(searchLower);
                return displayNameMatch || usernameMatch || handleMatch;
              });

              if (users.length === 0) {
                return (
                  <div className="bg-card rounded-lg p-8 border border-border text-center">
                    <p className="text-muted-foreground">
                      No Twitter users are being tracked yet. Visit the{' '}
                      <Link to="/admin/login" className="text-primary hover:underline">
                        admin dashboard
                      </Link>{' '}
                      to add users.
                    </p>
                  </div>
                );
              }

              if (filteredUsers.length === 0) {
                // Truncate very long search queries in the display message
                const displayQuery = userSearchQuery.length > 50
                  ? userSearchQuery.substring(0, 50) + '...'
                  : userSearchQuery;
                return (
                  <div className="bg-card rounded-lg p-8 border border-border text-center">
                    <p className="text-muted-foreground break-words">
                      No users found matching "{displayQuery}". Try a different search term.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              );
            })()}
          </section>

          {/* Stats footer */}
          {data && (
            <section className="mt-10 pt-6 border-t border-border">
              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{data.stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Tracked Users</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-violet">{data.stats.totalTweets}</p>
                  <p className="text-sm text-muted-foreground">Tweets Analyzed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{data.stats.totalAnalyses}</p>
                  <p className="text-sm text-muted-foreground">Sentiment Analyses</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
