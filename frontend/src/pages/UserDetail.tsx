// User Detail page - Shows detailed sentiment analysis for a specific user
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Types for tweet data
interface TweetData {
  id: number;
  tweetId: string;
  content: string;
  tweetTimestamp: string;
  engagement: { likes: number; retweets: number; replies: number } | null;
  isRetweet: boolean;
  isReply: boolean;
  createdAt: string;
  topEmotion: string;
  topEmotionScore: number;
  combinedEmotions: Record<string, number>;
  analysisCount: number;
}

interface TweetListResponse {
  userId: string;
  tweets: TweetData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  emotionColors: Record<string, { color: string }>;
}

// Types for user data
interface UserData {
  id: number;
  twitter_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  aggregations: AggregationData[];
  emotionAverages: Record<string, number>; // Real-time calculated averages
  emotionMedians: Record<string, number>;  // Real-time calculated medians
  emotionColors: Record<string, { color: string; enabled: boolean }>;
  analysisCount: number;
  tweetCount: number;
}

interface AggregationData {
  time_bucket: string;
  emotion_averages: string;
  emotion_medians: string;
  tweet_count: number;
  computed_at: string;
}

// Types for emotion trends data
interface TrendDataPoint {
  timestamp: string;
  emotions: Record<string, number>;
}

interface TrendsResponse {
  userId: string;
  timeBucket: string;
  dataPoints: TrendDataPoint[];
  emotions: string[];
  emotionColors: Record<string, { color: string }>;
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

// Loading skeleton component
function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-muted"></div>
        <div className="flex-1">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-5 bg-muted rounded w-32 mb-4"></div>
          <div className="h-4 bg-muted rounded w-full max-w-md"></div>
        </div>
      </div>
    </div>
  );
}

// User profile header component
function UserProfileHeader({ user }: { user: UserData }) {
  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-card mb-8">
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-muted overflow-hidden flex-shrink-0 ring-4 ring-primary-cyan/20">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '';
                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full bg-primary-cyan/20 flex items-center justify-center"><span class="text-3xl font-bold text-primary">${user.display_name?.[0] || user.username[0]}</span></div>`;
              }}
            />
          ) : (
            <div className="w-full h-full bg-primary-cyan/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {user.display_name?.[0] || user.username[0]}
              </span>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            {user.display_name}
          </h1>
          <a
            href={`https://twitter.com/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            @{user.username}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {user.bio && (
            <p className="text-muted-foreground mt-3 max-w-2xl">{user.bio}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <span className="text-xl font-bold text-foreground">{formatNumber(user.follower_count)}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">{formatNumber(user.following_count)}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div>
              <span className="text-xl font-bold text-primary">{user.tweetCount}</span>
              <span className="text-muted-foreground ml-1">Tweets Analyzed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Emotion stats display (averages and medians with toggle)
function EmotionAverages({
  emotionAverages,
  emotionMedians,
  emotionColors,
  analysisCount,
}: {
  emotionAverages: Record<string, number>;
  emotionMedians?: Record<string, number>;
  emotionColors: Record<string, { color: string; enabled: boolean }>;
  analysisCount: number;
}) {
  const [showMedians, setShowMedians] = useState(false);

  // Check if we have any data
  const hasData = emotionAverages && Object.keys(emotionAverages).length > 0;

  if (!hasData) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-card">
        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <span className="text-primary-violet">📊</span>
          Emotion Statistics
        </h2>
        <p className="text-muted-foreground text-center py-8">
          No sentiment analysis data available yet. Check back after tweets have been analyzed.
        </p>
      </div>
    );
  }

  // Default colors if not provided from API
  const defaultColors: Record<string, string> = {
    happy: '#FFD700',
    sad: '#4169E1',
    angry: '#FF4444',
    fearful: '#9932CC',
    hatred: '#8B0000',
    thankful: '#32CD32',
    excited: '#FF6B35',
    hopeful: '#00CED1',
    frustrated: '#FF8C00',
    sarcastic: '#BA55D3',
    inspirational: '#FFD700',
    anxious: '#708090',
  };

  // Use medians if toggle is on, otherwise averages
  const displayData = showMedians && emotionMedians ? emotionMedians : emotionAverages;

  // Sort emotions by value (highest first)
  const emotions = Object.entries(displayData).sort((a, b) => b[1] - a[1]);

  // Get color for an emotion - prefer API colors, fall back to defaults
  const getColor = (emotion: string): string => {
    if (emotionColors && emotionColors[emotion]?.color) {
      return emotionColors[emotion].color;
    }
    return defaultColors[emotion] || '#888';
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <span className="text-primary-violet">📊</span>
          Emotion {showMedians ? 'Medians' : 'Averages'}
          <span className="text-sm font-normal text-muted-foreground">
            ({analysisCount} {analysisCount === 1 ? 'analysis' : 'analyses'})
          </span>
        </h2>
        {emotionMedians && Object.keys(emotionMedians).length > 0 && (
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            <button
              onClick={() => setShowMedians(false)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                !showMedians
                  ? 'bg-primary-cyan text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Average
            </button>
            <button
              onClick={() => setShowMedians(true)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                showMedians
                  ? 'bg-primary-cyan text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Median
            </button>
          </div>
        )}
      </div>
      <div className="space-y-3">
        {emotions.map(([emotion, value]) => (
          <div key={emotion} className="flex items-center gap-3">
            <span className="text-sm text-foreground capitalize w-24">{emotion}</span>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${value}%`,
                  backgroundColor: getColor(emotion),
                }}
              />
            </div>
            <span className="text-sm font-mono text-muted-foreground w-10 text-right">
              {Math.round(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tweet list component
function TweetList({
  tweets,
  emotionColors,
  isLoading,
  pagination,
  onPageChange,
}: {
  tweets: TweetData[];
  emotionColors: Record<string, { color: string }>;
  isLoading: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  onPageChange: (page: number) => void;
}) {
  const defaultColors: Record<string, string> = {
    happy: '#FFD700',
    sad: '#4169E1',
    angry: '#FF4444',
    fearful: '#9932CC',
    hatred: '#8B0000',
    thankful: '#32CD32',
    excited: '#FF6B35',
    hopeful: '#00CED1',
    frustrated: '#FF8C00',
    sarcastic: '#BA55D3',
    inspirational: '#FFD700',
    anxious: '#708090',
  };

  const getColor = (emotion: string): string => {
    if (emotionColors && emotionColors[emotion]?.color) {
      return emotionColors[emotion].color;
    }
    return defaultColors[emotion] || '#888';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEngagement = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 border border-border rounded-lg">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No tweets have been analyzed yet for this user.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {tweets.map((tweet) => (
        <Link
          key={tweet.id}
          to={`/tweets/${tweet.id}`}
          className="block p-4 border border-border rounded-lg hover:border-primary-cyan/50 hover:bg-muted/50 transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(tweet.tweetTimestamp)}
            </span>
            {tweet.topEmotion !== 'none' && (
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${getColor(tweet.topEmotion)}20`,
                  color: getColor(tweet.topEmotion),
                }}
              >
                {tweet.topEmotion} ({tweet.topEmotionScore})
              </span>
            )}
          </div>
          <p className="text-foreground text-sm line-clamp-3 mb-3 whitespace-pre-wrap">
            {tweet.content}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-4">
              {tweet.engagement && (
                <>
                  <span>❤️ {formatEngagement(tweet.engagement.likes)}</span>
                  <span>🔁 {formatEngagement(tweet.engagement.retweets)}</span>
                  <span>💬 {formatEngagement(tweet.engagement.replies)}</span>
                </>
              )}
            </div>
            {tweet.analysisCount > 0 && (
              <span className="text-primary">
                {tweet.analysisCount} {tweet.analysisCount === 1 ? 'analysis' : 'analyses'}
              </span>
            )}
          </div>
        </Link>
      ))}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// Emotion trends chart component
function EmotionTrends({ userId }: { userId: number }) {
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeBucket, setTimeBucket] = useState<string>('daily');
  const [selectedEmotions, setSelectedEmotions] = useState<Set<string>>(new Set());

  // Request counter to ignore stale responses
  const requestCounterRef = useRef(0);

  useEffect(() => {
    const fetchTrends = async () => {
      // Increment request counter for stale response tracking
      requestCounterRef.current += 1;
      const currentRequestId = requestCounterRef.current;

      try {
        setIsLoading(true);
        const response = await fetch(
          `http://localhost:3001/api/users/${userId}/trends?timeBucket=${timeBucket}`
        );

        // Check if this response is stale
        if (currentRequestId !== requestCounterRef.current) {
          console.log(`Ignoring stale trends response (request ${currentRequestId}, current ${requestCounterRef.current})`);
          return;
        }

        if (response.ok) {
          const data = await response.json();

          // Double-check staleness after parse
          if (currentRequestId !== requestCounterRef.current) {
            console.log(`Ignoring stale trends response after parse (request ${currentRequestId}, current ${requestCounterRef.current})`);
            return;
          }

          setTrends(data);
          // Default: select top 4 emotions by average value if none selected
          if (selectedEmotions.size === 0 && data.dataPoints.length > 0) {
            const emotionAverages: Record<string, number> = {};
            for (const point of data.dataPoints) {
              for (const [emotion, value] of Object.entries(point.emotions)) {
                emotionAverages[emotion] =
                  (emotionAverages[emotion] || 0) + (value as number);
              }
            }
            const topEmotions = Object.entries(emotionAverages)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([e]) => e);
            setSelectedEmotions(new Set(topEmotions));
          }
        }
      } catch (err) {
        // Don't update state if stale
        if (currentRequestId !== requestCounterRef.current) {
          return;
        }
        console.error('Error fetching trends:', err);
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestCounterRef.current) {
          setIsLoading(false);
        }
      }
    };
    fetchTrends();
  }, [userId, timeBucket]);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emotion)) {
        newSet.delete(emotion);
      } else {
        newSet.add(emotion);
      }
      return newSet;
    });
  };

  const defaultColors: Record<string, string> = {
    happy: '#FFD700',
    sad: '#4169E1',
    angry: '#FF4444',
    fearful: '#9932CC',
    hatred: '#8B0000',
    thankful: '#32CD32',
    excited: '#FF6B35',
    hopeful: '#00CED1',
    frustrated: '#FF8C00',
    sarcastic: '#BA55D3',
    inspirational: '#FFD700',
    anxious: '#708090',
  };

  const getColor = (emotion: string): string => {
    return trends?.emotionColors[emotion]?.color || defaultColors[emotion] || '#888';
  };

  const formatDate = (timestamp: string): string => {
    // Handle different formats: YYYY-MM-DD or YYYY-MM
    if (timestamp.length === 7) {
      // Monthly format
      const [year, month] = timestamp.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-card">
        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <span className="text-primary">📈</span>
          Emotion Trends
        </h2>
        <div className="animate-pulse h-64 bg-muted rounded"></div>
      </div>
    );
  }

  if (!trends || trends.dataPoints.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-card">
        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <span className="text-primary">📈</span>
          Emotion Trends
        </h2>
        <p className="text-muted-foreground text-center py-8">
          Not enough data to display trends. Check back after more tweets have been analyzed.
        </p>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = trends.dataPoints.map((point) => ({
    date: formatDate(point.timestamp),
    ...point.emotions,
  }));

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <span className="text-primary">📈</span>
          Emotion Trends
        </h2>
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly'].map((bucket) => (
            <button
              key={bucket}
              onClick={() => setTimeBucket(bucket)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeBucket === bucket
                  ? 'bg-primary-cyan text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {bucket.charAt(0).toUpperCase() + bucket.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Emotion toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {trends.emotions.map((emotion) => (
          <button
            key={emotion}
            onClick={() => toggleEmotion(emotion)}
            className={`px-2 py-1 text-xs rounded-full transition-all ${
              selectedEmotions.has(emotion)
                ? 'ring-2 ring-offset-2 ring-offset-background'
                : 'opacity-50 hover:opacity-75'
            }`}
            style={{
              backgroundColor: `${getColor(emotion)}30`,
              color: getColor(emotion),
              borderColor: getColor(emotion),
              ...(selectedEmotions.has(emotion) && { ringColor: getColor(emotion) }),
            }}
          >
            {emotion}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {trends.emotions
              .filter((emotion) => selectedEmotions.has(emotion))
              .map((emotion) => (
                <Line
                  key={emotion}
                  type="monotone"
                  dataKey={emotion}
                  stroke={getColor(emotion)}
                  strokeWidth={2}
                  dot={{ r: 4, fill: getColor(emotion) }}
                  activeDot={{ r: 6 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Click emotions above to show/hide them on the chart
      </p>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tweet list state
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [tweetsLoading, setTweetsLoading] = useState(false);
  const [tweetPagination, setTweetPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [tweetColors, setTweetColors] = useState<Record<string, { color: string }>>({});

  // Time filter state for tweets
  const [tweetTimePeriod, setTweetTimePeriod] = useState<string>('all_time');

  // Request counters to ignore stale responses
  const tweetRequestCounterRef = useRef(0);
  const userRequestCounterRef = useRef(0);

  // Fetch user tweets with stale response prevention
  const fetchTweets = async (page: number = 1, period: string = tweetTimePeriod) => {
    if (!id) return;

    // Increment request counter for stale response tracking
    tweetRequestCounterRef.current += 1;
    const currentRequestId = tweetRequestCounterRef.current;

    try {
      setTweetsLoading(true);
      const response = await fetch(
        `http://localhost:3001/api/users/${id}/tweets?page=${page}&limit=10&period=${period}`
      );

      // Check if this response is stale
      if (currentRequestId !== tweetRequestCounterRef.current) {
        console.log(`Ignoring stale tweets response (request ${currentRequestId}, current ${tweetRequestCounterRef.current})`);
        return;
      }

      if (!response.ok) {
        console.error('Failed to fetch tweets');
        return;
      }

      const data: TweetListResponse = await response.json();

      // Double-check staleness after parse
      if (currentRequestId !== tweetRequestCounterRef.current) {
        console.log(`Ignoring stale tweets response after parse (request ${currentRequestId}, current ${tweetRequestCounterRef.current})`);
        return;
      }

      setTweets(data.tweets);
      setTweetPagination(data.pagination);
      setTweetColors(data.emotionColors);
    } catch (err) {
      // Don't update state if stale
      if (currentRequestId !== tweetRequestCounterRef.current) {
        return;
      }
      console.error('Error fetching tweets:', err);
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === tweetRequestCounterRef.current) {
        setTweetsLoading(false);
      }
    }
  };

  const handlePageChange = (page: number) => {
    fetchTweets(page, tweetTimePeriod);
  };

  // Handle time period change - reset to page 1
  const handleTimePeriodChange = (period: string) => {
    setTweetTimePeriod(period);
    // Reset pagination to page 1 when filter changes
    fetchTweets(1, period);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;

      // Increment request counter for stale response tracking
      userRequestCounterRef.current += 1;
      const currentRequestId = userRequestCounterRef.current;

      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:3001/api/users/${id}`);

        // Check if this response is stale (user navigated to different user)
        if (currentRequestId !== userRequestCounterRef.current) {
          console.log(`Ignoring stale user response (request ${currentRequestId}, current ${userRequestCounterRef.current})`);
          return;
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();

        // Double-check staleness after parse
        if (currentRequestId !== userRequestCounterRef.current) {
          console.log(`Ignoring stale user response after parse (request ${currentRequestId}, current ${userRequestCounterRef.current})`);
          return;
        }

        setUser(userData);
        setError(null);

        // Fetch tweets after user data is loaded
        fetchTweets(1);
      } catch (err) {
        // Don't update state if stale
        if (currentRequestId !== userRequestCounterRef.current) {
          return;
        }
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === userRequestCounterRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchUser();
  }, [id]);

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
          Dashboard
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="text-foreground">
          {user ? user.display_name : 'User Details'}
        </span>
      </nav>

      {/* Loading state */}
      {isLoading && <ProfileSkeleton />}

      {/* Error state */}
      {error && !isLoading && (
        <div role="alert" className="bg-error/10 border border-error/30 rounded-lg p-6 text-center">
          <p className="text-error font-medium mb-2">{error}</p>
          <Link to="/" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      )}

      {/* User profile */}
      {user && !isLoading && (
        <>
          <UserProfileHeader user={user} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion Averages/Medians */}
            <EmotionAverages
              emotionAverages={user.emotionAverages}
              emotionMedians={user.emotionMedians}
              emotionColors={user.emotionColors}
              analysisCount={user.analysisCount}
            />

            {/* Emotion Trends Chart */}
            <EmotionTrends userId={user.id} />
          </div>

          {/* Tweet List Section */}
          <div className="mt-6 bg-card rounded-lg p-6 border border-border shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="text-primary-violet">💬</span>
                Recent Tweets
                {tweetPagination && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({tweetPagination.total} {tweetPagination.total === 1 ? 'tweet' : 'tweets'})
                  </span>
                )}
              </h2>
              {/* Time Filter Buttons */}
              <div className="flex gap-2">
                {[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'all_time', label: 'All Time' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimePeriodChange(option.value)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      tweetTimePeriod === option.value
                        ? 'bg-primary-cyan text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <TweetList
              tweets={tweets}
              emotionColors={tweetColors}
              isLoading={tweetsLoading}
              pagination={tweetPagination}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
