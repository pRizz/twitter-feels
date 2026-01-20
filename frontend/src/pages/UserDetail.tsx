// User Detail page - Shows detailed sentiment analysis for a specific user
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

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
  tweetCount: number;
}

interface AggregationData {
  time_bucket: string;
  emotion_averages: string;
  emotion_medians: string;
  tweet_count: number;
  computed_at: string;
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
    <div className="bg-card rounded-lg p-6 border border-border shadow-md mb-8">
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
                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full bg-primary-cyan/20 flex items-center justify-center"><span class="text-3xl font-bold text-primary-cyan">${user.display_name?.[0] || user.username[0]}</span></div>`;
              }}
            />
          ) : (
            <div className="w-full h-full bg-primary-cyan/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-cyan">
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
            className="text-primary-cyan hover:underline inline-flex items-center gap-1"
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
              <span className="text-xl font-bold text-primary-cyan">{user.tweetCount}</span>
              <span className="text-muted-foreground ml-1">Tweets Analyzed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Emotion averages display
function EmotionAverages({ aggregations }: { aggregations: AggregationData[] }) {
  if (!aggregations || aggregations.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <span className="text-primary-violet">📊</span>
          Emotion Averages
        </h2>
        <p className="text-muted-foreground text-center py-8">
          No sentiment analysis data available yet. Check back after tweets have been analyzed.
        </p>
      </div>
    );
  }

  // Parse the first aggregation's emotion averages
  let emotionData: Record<string, number> = {};
  try {
    emotionData = JSON.parse(aggregations[0].emotion_averages);
  } catch {
    // Empty object if parsing fails
  }

  const emotionColors: Record<string, string> = {
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

  const emotions = Object.entries(emotionData).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
        <span className="text-primary-violet">📊</span>
        Emotion Averages ({aggregations[0].time_bucket})
      </h2>
      <div className="space-y-3">
        {emotions.map(([emotion, value]) => (
          <div key={emotion} className="flex items-center gap-3">
            <span className="text-sm text-foreground capitalize w-24">{emotion}</span>
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${value}%`,
                  backgroundColor: emotionColors[emotion] || '#888',
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

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:3001/api/users/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-primary-cyan transition-colors">
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
        <div className="bg-error/10 border border-error/30 rounded-lg p-6 text-center">
          <p className="text-error font-medium mb-2">{error}</p>
          <Link to="/" className="text-primary-cyan hover:underline">
            Return to Dashboard
          </Link>
        </div>
      )}

      {/* User profile */}
      {user && !isLoading && (
        <>
          <UserProfileHeader user={user} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion Averages */}
            <EmotionAverages aggregations={user.aggregations} />

            {/* Coming Soon Sections */}
            <div className="bg-card rounded-lg p-6 border border-border shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <span className="text-primary-cyan">📈</span>
                Emotion Trends
              </h2>
              <p className="text-muted-foreground text-center py-8">
                Time-series emotion charts coming soon.
              </p>
            </div>
          </div>

          {/* Tweet List Section */}
          <div className="mt-6 bg-card rounded-lg p-6 border border-border shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="text-primary-violet">💬</span>
              Recent Tweets
            </h2>
            {user.tweetCount > 0 ? (
              <p className="text-muted-foreground">Tweet list with sentiment scores coming soon.</p>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No tweets have been analyzed yet for this user.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
