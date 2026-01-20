import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// Helper function to calculate gauge value from emotion scores
function calculateGaugeValue(
  gaugeConfig: { emotions: string[]; invertedEmotions?: string[] },
  emotionAverages: Record<string, number>
): number {
  let sum = 0;
  let count = 0;

  // Add regular emotions
  for (const emotion of gaugeConfig.emotions || []) {
    if (emotionAverages[emotion] !== undefined) {
      sum += emotionAverages[emotion];
      count++;
    }
  }

  // Subtract inverted emotions (e.g., sad for Mood Gauge)
  for (const emotion of gaugeConfig.invertedEmotions || []) {
    if (emotionAverages[emotion] !== undefined) {
      sum += (100 - emotionAverages[emotion]); // Invert: 100 - score
      count++;
    }
  }

  return count > 0 ? Math.round(sum / count) : 50; // Default to 50 if no data
}

// GET /api/dashboard - Main dashboard data
router.get('/dashboard', (req, res) => {
  try {
    void req.query.timeBucket; // TODO: implement time bucket filtering
    const modelId = req.query.modelId as string;

    // Get stats from database
    const userCount = db.prepare('SELECT COUNT(*) as count FROM twitter_users WHERE is_active = 1').get() as { count: number };
    const tweetCount = db.prepare('SELECT COUNT(*) as count FROM tweets').get() as { count: number };
    const analysisCount = db.prepare('SELECT COUNT(*) as count FROM sentiment_analyses').get() as { count: number };

    // Get gauge configuration
    const gaugeConfigRow = db.prepare("SELECT value FROM configurations WHERE key = 'gauges'").get() as { value: string } | undefined;
    const emotionConfigRow = db.prepare("SELECT value FROM configurations WHERE key = 'emotions'").get() as { value: string } | undefined;

    const gaugeConfigs = gaugeConfigRow ? JSON.parse(gaugeConfigRow.value) : [];
    const emotionColors = emotionConfigRow ? JSON.parse(emotionConfigRow.value) : {};

    // Calculate emotion averages from all sentiment analyses
    // If modelId is specified, filter by model; otherwise use all models
    let emotionQuery = `
      SELECT emotion_scores
      FROM sentiment_analyses sa
      JOIN tweets t ON sa.tweet_id = t.id
    `;
    const queryParams: unknown[] = [];

    if (modelId && modelId !== 'combined') {
      emotionQuery += ' WHERE sa.llm_model_id = ?';
      queryParams.push(modelId);
    }

    const analyses = db.prepare(emotionQuery).all(...queryParams) as Array<{ emotion_scores: string }>;

    // Aggregate emotion scores
    const emotionSums: Record<string, number> = {};
    const emotionCounts: Record<string, number> = {};

    for (const analysis of analyses) {
      const scores = JSON.parse(analysis.emotion_scores);
      for (const [emotion, score] of Object.entries(scores)) {
        if (typeof score === 'number') {
          emotionSums[emotion] = (emotionSums[emotion] || 0) + score;
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      }
    }

    // Calculate averages
    const emotionAverages: Record<string, number> = {};
    for (const emotion of Object.keys(emotionSums)) {
      emotionAverages[emotion] = Math.round(emotionSums[emotion] / emotionCounts[emotion]);
    }

    // Calculate gauge values
    const gauges = gaugeConfigs.map((config: { name: string; lowLabel: string; highLabel: string; emotions: string[]; invertedEmotions?: string[] }) => {
      // Get primary color from first emotion in the gauge
      const primaryEmotion = config.emotions[0];
      const color = emotionColors[primaryEmotion]?.color || '#00d4ff';

      return {
        name: config.name,
        value: calculateGaugeValue(config, emotionAverages),
        lowLabel: config.lowLabel,
        highLabel: config.highLabel,
        color,
      };
    });

    // Get the most recent analysis timestamp for "last updated"
    const lastAnalysis = db.prepare(`
      SELECT MAX(analyzed_at) as last_updated FROM sentiment_analyses
    `).get() as { last_updated: string | null } | undefined;

    const lastUpdated = lastAnalysis?.last_updated || new Date().toISOString();

    // Get tracked users with their top emotions for the user grid
    const users = db.prepare(`
      SELECT
        u.id, u.username, u.display_name, u.avatar_url, u.bio
      FROM twitter_users u
      WHERE u.is_active = 1
      ORDER BY u.follower_count DESC
      LIMIT 20
    `).all() as Array<{
      id: number;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
    }>;

    // Calculate top emotion for each user
    const usersWithEmotions = users.map(user => {
      const userAnalyses = db.prepare(`
        SELECT sa.emotion_scores
        FROM sentiment_analyses sa
        JOIN tweets t ON sa.tweet_id = t.id
        WHERE t.twitter_user_id = ?
      `).all(user.id) as Array<{ emotion_scores: string }>;

      let topEmotion = 'none';
      let topEmotionScore = 0;

      if (userAnalyses.length > 0) {
        const userEmotionSums: Record<string, number> = {};
        const userEmotionCounts: Record<string, number> = {};

        for (const analysis of userAnalyses) {
          const scores = JSON.parse(analysis.emotion_scores);
          for (const [emotion, score] of Object.entries(scores)) {
            if (typeof score === 'number') {
              userEmotionSums[emotion] = (userEmotionSums[emotion] || 0) + score;
              userEmotionCounts[emotion] = (userEmotionCounts[emotion] || 0) + 1;
            }
          }
        }

        // Find the emotion with highest average
        for (const emotion of Object.keys(userEmotionSums)) {
          const avg = userEmotionSums[emotion] / userEmotionCounts[emotion];
          if (avg > topEmotionScore) {
            topEmotionScore = Math.round(avg);
            topEmotion = emotion;
          }
        }
      }

      return {
        id: String(user.id),
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url || '',
        bio: user.bio || '',
        topEmotion,
        topEmotionScore,
      };
    });

    // Build leaderboards from user emotion data
    const emotions = Object.keys(emotionColors);
    const leaderboards = emotions.slice(0, 6).map(emotion => {
      // Get users sorted by this emotion (highest)
      const usersWithEmotion = usersWithEmotions
        .filter(u => u.topEmotion !== 'none')
        .map(u => {
          // Calculate this user's average for this specific emotion
          const userAnalyses = db.prepare(`
            SELECT sa.emotion_scores
            FROM sentiment_analyses sa
            JOIN tweets t ON sa.tweet_id = t.id
            WHERE t.twitter_user_id = ?
          `).all(Number(u.id)) as Array<{ emotion_scores: string }>;

          let emotionSum = 0;
          let emotionCount = 0;
          for (const analysis of userAnalyses) {
            const scores = JSON.parse(analysis.emotion_scores);
            if (typeof scores[emotion] === 'number') {
              emotionSum += scores[emotion];
              emotionCount++;
            }
          }

          return {
            userId: u.id,
            username: u.username,
            displayName: u.displayName,
            avatarUrl: u.avatarUrl,
            score: emotionCount > 0 ? Math.round(emotionSum / emotionCount) : 0,
          };
        })
        .filter(u => u.score > 0)
        .sort((a, b) => b.score - a.score);

      return {
        emotion,
        highest: usersWithEmotion.slice(0, 3),
        lowest: [...usersWithEmotion].sort((a, b) => a.score - b.score).slice(0, 3),
      };
    });

    res.json({
      lastUpdated,
      gauges,
      leaderboards,
      users: usersWithEmotions,
      stats: {
        totalUsers: userCount.count,
        totalTweets: tweetCount.count,
        totalAnalyses: analysisCount.count,
      },
      emotionAverages, // Include raw emotion averages for debugging/verification
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/users - List tracked Twitter users
router.get('/users', (_req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, twitter_id, username, display_name, bio, avatar_url,
             follower_count, following_count, is_active, created_at, updated_at
      FROM twitter_users
      WHERE is_active = 1
      ORDER BY display_name ASC
    `).all();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - User detail
router.get('/users/:id', (req, res) => {
  const { id } = req.params;

  try {
    const user = db.prepare(`
      SELECT id, twitter_id, username, display_name, bio, avatar_url,
             follower_count, following_count, is_active, created_at, updated_at
      FROM twitter_users
      WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get aggregations for this user (if available)
    const aggregations = db.prepare(`
      SELECT time_bucket, emotion_averages, emotion_medians, tweet_count, computed_at
      FROM user_aggregations
      WHERE twitter_user_id = ?
      ORDER BY computed_at DESC
    `).all(id);

    // Get tweet count for this user
    const tweetStats = db.prepare(`
      SELECT COUNT(*) as total_tweets
      FROM tweets
      WHERE twitter_user_id = ?
    `).get(id) as { total_tweets: number } | undefined;

    res.json({
      ...user,
      aggregations,
      tweetCount: tweetStats?.total_tweets || 0,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users/:id/tweets - User's tweets
router.get('/users/:id/tweets', (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  // TODO: Implement tweet listing
  res.json({
    userId: id,
    tweets: [],
    pagination: { page, limit, total: 0 },
  });
});

// GET /api/tweets/:id - Tweet detail
router.get('/tweets/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Get tweet data with user info
    const tweet = db.prepare(`
      SELECT
        t.id, t.tweet_id, t.content, t.tweet_timestamp,
        t.engagement_metrics, t.is_retweet, t.is_reply,
        t.created_at, t.updated_at,
        u.id as user_id, u.twitter_id as user_twitter_id, u.username,
        u.display_name, u.avatar_url
      FROM tweets t
      JOIN twitter_users u ON t.twitter_user_id = u.id
      WHERE t.id = ?
    `).get(id) as {
      id: number;
      tweet_id: string;
      content: string;
      tweet_timestamp: string;
      engagement_metrics: string | null;
      is_retweet: number;
      is_reply: number;
      created_at: string;
      updated_at: string;
      user_id: number;
      user_twitter_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    } | undefined;

    if (!tweet) {
      return res.status(404).json({ error: 'Tweet not found' });
    }

    // Get all sentiment analyses for this tweet
    const analyses = db.prepare(`
      SELECT
        sa.id, sa.emotion_scores, sa.raw_llm_response,
        sa.analyzed_at, sa.analysis_duration_ms,
        m.id as model_id, m.name as model_name, m.version as model_version, m.provider
      FROM sentiment_analyses sa
      JOIN llm_models m ON sa.llm_model_id = m.id
      WHERE sa.tweet_id = ?
      ORDER BY sa.analyzed_at DESC
    `).all(id) as Array<{
      id: number;
      emotion_scores: string;
      raw_llm_response: string | null;
      analyzed_at: string;
      analysis_duration_ms: number | null;
      model_id: number;
      model_name: string;
      model_version: string | null;
      provider: string | null;
    }>;

    // Parse JSON fields
    const engagement = tweet.engagement_metrics ? JSON.parse(tweet.engagement_metrics) : null;

    // Parse emotion scores for each analysis
    const parsedAnalyses = analyses.map(analysis => ({
      id: analysis.id,
      emotionScores: JSON.parse(analysis.emotion_scores),
      analyzedAt: analysis.analyzed_at,
      durationMs: analysis.analysis_duration_ms,
      model: {
        id: analysis.model_id,
        name: analysis.model_name,
        version: analysis.model_version,
        provider: analysis.provider,
      },
    }));

    // Calculate combined emotion scores (average across all models)
    let combinedEmotions: Record<string, number> = {};
    if (parsedAnalyses.length > 0) {
      const emotionSums: Record<string, number> = {};
      const emotionCounts: Record<string, number> = {};

      for (const analysis of parsedAnalyses) {
        for (const [emotion, score] of Object.entries(analysis.emotionScores)) {
          if (typeof score === 'number') {
            emotionSums[emotion] = (emotionSums[emotion] || 0) + score;
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          }
        }
      }

      for (const emotion of Object.keys(emotionSums)) {
        combinedEmotions[emotion] = Math.round(emotionSums[emotion] / emotionCounts[emotion]);
      }
    }

    // Get emotion colors from configuration
    const emotionConfig = db.prepare(`
      SELECT value FROM configurations WHERE key = 'emotions'
    `).get() as { value: string } | undefined;

    const emotionColors = emotionConfig ? JSON.parse(emotionConfig.value) : {};

    res.json({
      id: tweet.id,
      tweetId: tweet.tweet_id,
      content: tweet.content,
      tweetTimestamp: tweet.tweet_timestamp,
      engagement,
      isRetweet: Boolean(tweet.is_retweet),
      isReply: Boolean(tweet.is_reply),
      createdAt: tweet.created_at,
      user: {
        id: tweet.user_id,
        twitterId: tweet.user_twitter_id,
        username: tweet.username,
        displayName: tweet.display_name,
        avatarUrl: tweet.avatar_url,
      },
      analyses: parsedAnalyses,
      combinedEmotions,
      emotionColors,
    });
  } catch (error) {
    console.error('Error fetching tweet:', error);
    res.status(500).json({ error: 'Failed to fetch tweet' });
  }
});

// GET /api/models - Available LLM models
router.get('/models', (_req, res) => {
  // TODO: Implement model listing
  res.json({ models: [] });
});

// GET /api/aggregations - Time-series data
router.get('/aggregations', (req, res) => {
  const timeBucket = req.query.timeBucket || 'weekly';
  const modelId = req.query.modelId;

  // TODO: Implement aggregation fetching
  res.json({
    timeBucket,
    modelId: modelId || 'combined',
    data: [],
  });
});

// GET /api/leaderboards - Emotion leaderboards
router.get('/leaderboards', (_req, res) => {
  // TODO: Implement leaderboard fetching
  res.json({ leaderboards: {} });
});

export default router;
