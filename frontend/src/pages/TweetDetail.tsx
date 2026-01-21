// Tweet Detail page - Shows detailed sentiment breakdown for a specific tweet
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// Types for tweet detail data
interface TweetUser {
  id: number;
  twitterId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface TweetModel {
  id: number;
  name: string;
  version: string | null;
  provider: string | null;
}

interface TweetAnalysis {
  id: number;
  emotionScores: Record<string, number>;
  analyzedAt: string;
  durationMs: number | null;
  model: TweetModel;
}

interface TweetEngagement {
  likes?: number;
  retweets?: number;
  replies?: number;
}

interface TweetData {
  id: number;
  tweetId: string;
  content: string;
  tweetTimestamp: string;
  engagement: TweetEngagement | null;
  isRetweet: boolean;
  isReply: boolean;
  createdAt: string;
  user: TweetUser;
  analyses: TweetAnalysis[];
  combinedEmotions: Record<string, number>;
  emotionColors: Record<string, { color: string }>;
}

// Emotion bar component with animation
function EmotionBar({
  emotion,
  score,
  color,
}: {
  emotion: string;
  score: number;
  color: string;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-foreground capitalize w-24 truncate">{emotion}</span>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${animatedValue}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}50`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-3">
          <span className="text-xs font-bold text-foreground drop-shadow-md">
            {Math.round(animatedValue)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Model analysis card
function ModelAnalysisCard({ analysis }: { analysis: TweetAnalysis }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-foreground">{analysis.model.name}</h4>
          {analysis.model.version && (
            <span className="text-xs text-muted-foreground">v{analysis.model.version}</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            {new Date(analysis.analyzedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
            })}
          </span>
          {analysis.durationMs && (
            <span className="text-xs text-muted-foreground block">
              {analysis.durationMs}ms
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {Object.entries(analysis.emotionScores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([emotion, score]) => (
            <div key={emotion} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground capitalize">{emotion}</span>
              <span className="text-foreground font-mono">{score}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function TweetDetail() {
  const { id } = useParams();
  const [tweet, setTweet] = useState<TweetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTweet = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:3001/api/tweets/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Tweet not found');
          }
          throw new Error('Failed to fetch tweet');
        }

        const data = await response.json();
        setTweet(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching tweet:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tweet');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTweet();
  }, [id]);

  // Get color for emotion
  const getEmotionColor = (emotion: string): string => {
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

    if (tweet?.emotionColors?.[emotion]?.color) {
      return tweet.emotionColors[emotion].color;
    }
    return defaultColors[emotion] || '#6B7280';
  };

  // Format timestamp
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-cyan"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div role="alert" className="bg-card rounded-lg p-8 border border-border text-center">
          <h1 className="text-2xl font-bold text-error mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-cyan text-white rounded-lg hover:bg-primary-cyan/90 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // No tweet found
  if (!tweet) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-card rounded-lg p-8 border border-border text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Tweet Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The tweet you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-cyan text-white rounded-lg hover:bg-primary-cyan/90 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Sort emotions by score for display
  const sortedEmotions = Object.entries(tweet.combinedEmotions).sort(([, a], [, b]) => b - a);
  const hasAnalyses = tweet.analyses.length > 0;
  const hasEmotions = sortedEmotions.length > 0;

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Back link */}
      <div className="mb-6">
        <Link
          to={`/users/${tweet.user.id}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to @{tweet.user.username}
        </Link>
      </div>

      {/* Tweet Card */}
      <div className="bg-card rounded-lg p-6 shadow-md border border-border mb-8 animate-slide-up">
        {/* User info header */}
        <div className="flex items-start gap-4 mb-4">
          <Link
            to={`/users/${tweet.user.id}`}
            className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-primary-cyan/50 transition-all"
          >
            {tweet.user.avatarUrl ? (
              <img
                src={tweet.user.avatarUrl}
                alt={tweet.user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary-cyan/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {tweet.user.displayName?.[0] || tweet.user.username[0]}
                </span>
              </div>
            )}
          </Link>
          <div className="flex-1">
            <Link
              to={`/users/${tweet.user.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {tweet.user.displayName}
            </Link>
            <p className="text-sm text-muted-foreground">@{tweet.user.username}</p>
          </div>
          {/* Tweet type badges */}
          <div className="flex gap-2">
            {tweet.isRetweet && (
              <span className="px-2 py-1 text-xs bg-primary-cyan/10 text-primary rounded-full">
                Retweet
              </span>
            )}
            {tweet.isReply && (
              <span className="px-2 py-1 text-xs bg-primary-violet/10 text-primary-violet rounded-full">
                Reply
              </span>
            )}
          </div>
        </div>

        {/* Tweet content */}
        <div className="mb-4">
          <p className="text-lg text-foreground whitespace-pre-wrap leading-relaxed">
            {tweet.content}
          </p>
        </div>

        {/* Tweet metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
          <span>{formatDate(tweet.tweetTimestamp)}</span>
          {tweet.engagement && (
            <>
              {tweet.engagement.likes !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {tweet.engagement.likes.toLocaleString()}
                </span>
              )}
              {tweet.engagement.retweets !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {tweet.engagement.retweets.toLocaleString()}
                </span>
              )}
              {tweet.engagement.replies !== undefined && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {tweet.engagement.replies.toLocaleString()}
                </span>
              )}
            </>
          )}
          <a
            href={`https://twitter.com/${tweet.user.username}/status/${tweet.tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-primary hover:underline"
          >
            View on Twitter
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* Emotion Breakdown Section */}
      <section className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
          <span className="text-primary">📊</span>
          Emotion Breakdown
        </h2>

        {hasEmotions ? (
          <div className="bg-card rounded-lg p-6 shadow-md border border-border">
            <div className="space-y-3">
              {sortedEmotions.map(([emotion, score]) => (
                <EmotionBar
                  key={emotion}
                  emotion={emotion}
                  score={score}
                  color={getEmotionColor(emotion)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg p-8 border border-border text-center">
            <p className="text-muted-foreground">
              No emotion analysis available for this tweet yet.
            </p>
          </div>
        )}
      </section>

      {/* Model Analyses Section */}
      <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
          <span className="text-primary-violet">🤖</span>
          Analysis by Model
        </h2>

        {hasAnalyses ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tweet.analyses.map((analysis) => (
              <ModelAnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg p-8 border border-border text-center">
            <p className="text-muted-foreground">
              This tweet has not been analyzed by any LLM models yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
