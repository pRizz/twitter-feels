// Dashboard page - Main public dashboard with gauges, leaderboards, and user grid
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
}

// Gauge component
function Gauge({ name, value, lowLabel, highLabel, color }: GaugeData) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="bg-card rounded-lg p-4 shadow-md border border-border">
      <h3 className="text-lg font-semibold mb-2 text-foreground">{name}</h3>
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${animatedValue}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`,
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
    <div className="bg-card rounded-lg p-4 shadow-md border border-border">
      <h3 className="text-lg font-semibold mb-3 text-foreground capitalize">
        {data.emotion} Leaderboard
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-primary-cyan mb-2">Highest</h4>
          <ul className="space-y-2">
            {data.highest.length > 0 ? (
              data.highest.slice(0, 3).map((entry, index) => (
                <li key={entry.userId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary-cyan/20" />
                    )}
                  </div>
                  <span className="text-sm text-foreground truncate flex-1">
                    {entry.displayName || entry.username}
                  </span>
                  <span className="text-xs font-mono text-primary-cyan">{entry.score}</span>
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
                      <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
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
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-cyan/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary-cyan">
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
        <span className="text-sm font-medium text-primary-cyan capitalize">
          {user.topEmotion}: {user.topEmotionScore}
        </span>
      </div>
    </Link>
  );
}

// Time period selector
function TimePeriodSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
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
                ? 'bg-primary-cyan text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
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
      <span className="text-sm text-muted-foreground">Model:</span>
      <select
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

export default function Dashboard() {
  const [timePeriod, setTimePeriod] = useState('weekly');
  const [modelFilter, setModelFilter] = useState('combined');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<LLMModel[]>([]);

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
        const response = await fetch(
          `http://localhost:3001/api/dashboard?timeBucket=${timePeriod}&modelId=${modelFilter}`
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
  }, [timePeriod, modelFilter]);

  const gauges = data?.gauges?.length ? data.gauges : DEFAULT_GAUGES;
  const leaderboards = data?.leaderboards || [];
  const users = data?.users || [];

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Twitter Feels Dashboard</h1>
        <div className="flex flex-wrap items-center gap-4">
          <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
          <ModelFilter
            value={modelFilter}
            onChange={setModelFilter}
            models={models}
          />
        </div>
      </div>

      {/* Error message with retry option */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
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
                fetch(`http://localhost:3001/api/dashboard?timeBucket=${timePeriod}&modelId=${modelFilter}`)
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-cyan"></div>
        </div>
      )}

      {/* Empty state message when no data matches current filters */}
      {!isLoading && !error && data && data.filteredAnalysisCount === 0 && (
        <div className="mb-6 p-4 bg-primary-cyan/10 border border-primary-cyan/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-primary-cyan font-medium">No sentiment data for selected filters</span>
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
                Visit the <a href="/admin/login" className="text-primary-cyan hover:underline">admin dashboard</a> to check crawler status.
              </>
            )}
          </p>
        </div>
      )}

      {/* Average Twitter Feel Section - Gauges */}
      <section className="mb-10 animate-slide-up">
        <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
          <span className="text-primary-cyan">⚡</span>
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
        <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
          <span className="text-primary-cyan">👥</span>
          Tracked Influencers
        </h2>
        {users.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg p-8 border border-border text-center">
            <p className="text-muted-foreground">
              No Twitter users are being tracked yet. Visit the{' '}
              <Link to="/admin/login" className="text-primary-cyan hover:underline">
                admin dashboard
              </Link>{' '}
              to add users.
            </p>
          </div>
        )}
      </section>

      {/* Stats footer */}
      {data && (
        <section className="mt-10 pt-6 border-t border-border">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-cyan">{data.stats.totalUsers}</p>
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
    </div>
  );
}
