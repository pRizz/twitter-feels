import { Router, Request, Response, NextFunction } from 'express';
import db from '../db/connection.js';

const router = Router();

// Type definitions for crawler runs
interface CrawlerRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  tweets_fetched: number;
  tweets_analyzed: number;
  errors_count: number;
  error_details: string | null;
}

// Type definitions for models
interface LLMModel {
  id: number;
  name: string;
  version: string | null;
  provider: string | null;
  huggingface_model_id: string | null;
  is_local: number;
  is_enabled: number;
  download_status: string;
  disk_size_bytes: number | null;
  created_at: string;
  updated_at: string;
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

// Extend session type for admin authentication
declare module 'express-session' {
  interface SessionData {
    adminId?: number;
    adminUsername?: string;
  }
}

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // TODO: Implement actual authentication with password hash comparison
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Placeholder - will be replaced with actual auth
  // In production, compare against hashed password in database
  console.log('Login attempt for:', username);

  req.session.adminId = 1;
  req.session.adminUsername = username;

  res.json({ success: true, message: 'Logged in successfully' });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// All routes below require authentication
router.use(requireAuth);

// GET /api/admin/crawler/status
router.get('/crawler/status', (_req, res) => {
  try {
    // Get currently running crawler (if any)
    const runningCrawler = db.prepare(`
      SELECT * FROM crawler_runs
      WHERE status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `).get() as CrawlerRun | undefined;

    // Get latest completed crawler run
    const latestRun = db.prepare(`
      SELECT * FROM crawler_runs
      ORDER BY started_at DESC
      LIMIT 1
    `).get() as CrawlerRun | undefined;

    // Get crawler config
    const configResult = db.prepare(`SELECT value FROM configurations WHERE key = 'crawler'`).get() as { value: string } | undefined;
    const config = configResult
      ? JSON.parse(configResult.value)
      : { intervalHours: 1, historyDepthDays: 90, rateLimitPer15Min: 450 };

    // Get recent runs
    const recentRuns = db.prepare(`
      SELECT * FROM crawler_runs
      ORDER BY started_at DESC
      LIMIT 5
    `).all() as CrawlerRun[];

    // Calculate next run time
    let nextRun: string | null = null;
    if (latestRun?.completed_at) {
      const lastCompleted = new Date(latestRun.completed_at);
      const nextRunTime = new Date(lastCompleted.getTime() + config.intervalHours * 60 * 60 * 1000);
      nextRun = nextRunTime.toISOString();
    } else if (!latestRun) {
      // No runs yet, next run is now
      nextRun = new Date().toISOString();
    }

    res.json({
      status: runningCrawler ? 'running' : 'idle',
      isRunning: !!runningCrawler,
      lastRun: latestRun ? {
        id: latestRun.id,
        startedAt: latestRun.started_at,
        completedAt: latestRun.completed_at,
        status: latestRun.status,
        tweetsFetched: latestRun.tweets_fetched,
        tweetsAnalyzed: latestRun.tweets_analyzed,
        errorsCount: latestRun.errors_count,
      } : null,
      nextRun,
      config: {
        intervalHours: config.intervalHours,
        historyDepthDays: config.historyDepthDays,
        rateLimitPer15Min: config.rateLimitPer15Min,
      },
      recentRuns: recentRuns.map(run => ({
        id: run.id,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        status: run.status,
        tweetsFetched: run.tweets_fetched,
        tweetsAnalyzed: run.tweets_analyzed,
        errorsCount: run.errors_count,
      })),
    });
  } catch (error) {
    console.error('Error getting crawler status:', error);
    res.status(500).json({ error: 'Failed to get crawler status' });
  }
});

// POST /api/admin/crawler/trigger
router.post('/crawler/trigger', (_req, res) => {
  try {
    // Check if crawler is already running
    const runningCrawler = db.prepare(`
      SELECT * FROM crawler_runs
      WHERE status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `).get() as CrawlerRun | undefined;

    if (runningCrawler) {
      return res.status(409).json({
        success: false,
        error: 'Crawler is already running',
        currentRun: {
          id: runningCrawler.id,
          startedAt: runningCrawler.started_at,
        },
      });
    }

    // Create a new crawler run record
    const newRun = db.prepare(`
      INSERT INTO crawler_runs (status, tweets_fetched, tweets_analyzed, errors_count)
      VALUES ('running', 0, 0, 0)
      RETURNING *
    `).get() as CrawlerRun;

    res.json({
      success: true,
      message: 'Crawler started',
      runId: newRun.id,
      startedAt: newRun.started_at,
    });

    // Simulate crawler completion after 5 seconds (for demo purposes)
    // In production, the Rust crawler would update this
    setTimeout(() => {
      db.prepare(`
        UPDATE crawler_runs
        SET status = 'completed',
            completed_at = datetime('now'),
            tweets_fetched = ?,
            tweets_analyzed = ?
        WHERE id = ?
      `).run(
        Math.floor(Math.random() * 50) + 10,
        Math.floor(Math.random() * 40) + 5,
        newRun.id
      );
      console.log(`Crawler run ${newRun.id} completed (simulated)`);
    }, 5000);
  } catch (error) {
    console.error('Error triggering crawler:', error);
    res.status(500).json({ error: 'Failed to trigger crawler' });
  }
});

// Type definitions for Twitter users
interface TwitterUser {
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
}

// GET /api/admin/users - List tracked users (admin view)
router.get('/users', (_req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, twitter_id, username, display_name, bio, avatar_url,
             follower_count, following_count, is_active, created_at, updated_at
      FROM twitter_users
      ORDER BY display_name ASC
    `).all() as TwitterUser[];

    // Get tweet counts for each user
    const tweetCounts = db.prepare(`
      SELECT twitter_user_id, COUNT(*) as count
      FROM tweets
      GROUP BY twitter_user_id
    `).all() as Array<{ twitter_user_id: number; count: number }>;

    const countMap = new Map(tweetCounts.map(tc => [tc.twitter_user_id, tc.count]));

    const formattedUsers = users.map((user) => ({
      id: user.id,
      twitterId: user.twitter_id,
      username: user.username,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      isActive: Boolean(user.is_active),
      tweetCount: countMap.get(user.id) || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// POST /api/admin/users - Add tracked user
router.post('/users', (req, res) => {
  const { handle, displayName } = req.body;

  if (!handle) {
    return res.status(400).json({ error: 'Twitter handle is required' });
  }

  try {
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM twitter_users WHERE username = ?').get(handle.replace('@', ''));
    if (existing) {
      return res.status(409).json({ error: 'User already being tracked' });
    }

    // Add new user (in production, this would call Twitter API to get user data)
    const username = handle.replace('@', '');
    const result = db.prepare(`
      INSERT INTO twitter_users (twitter_id, username, display_name, is_active)
      VALUES (?, ?, ?, 1)
      RETURNING *
    `).get(
      `mock_${username}_${Date.now()}`, // Mock Twitter ID
      username,
      displayName || username
    ) as TwitterUser;

    res.json({
      success: true,
      message: `User @${username} added`,
      user: {
        id: result.id,
        username: result.username,
        displayName: result.display_name,
        isActive: true,
      },
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

// PUT /api/admin/users/:id - Update tracked user (enable/disable)
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const user = db.prepare('SELECT * FROM twitter_users WHERE id = ?').get(id) as TwitterUser | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare(`
      UPDATE twitter_users
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(isActive ? 1 : 0, id);

    res.json({
      success: true,
      message: `User ${isActive ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Remove tracked user
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  try {
    const user = db.prepare('SELECT * FROM twitter_users WHERE id = ?').get(id) as TwitterUser | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM twitter_users WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `User @${user.username} removed`,
    });
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// GET /api/admin/settings
router.get('/settings', (_req, res) => {
  // TODO: Implement settings fetching
  res.json({
    crawler: {
      intervalHours: 1,
      historyDepthDays: 90,
      rateLimitPer15Min: 450,
    },
    backup: {
      enabled: false,
      bucket: '',
      schedule: '',
    },
  });
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  const settings = req.body;
  // TODO: Implement settings update
  console.log('Settings update:', settings);
  res.json({ success: true, message: 'Settings updated' });
});

// GET /api/admin/models
router.get('/models', (_req, res) => {
  // Get installed models from database
  const installedModels = db.prepare(`
    SELECT id, name, version, provider, huggingface_model_id,
           is_local, is_enabled, download_status, disk_size_bytes,
           created_at, updated_at
    FROM llm_models
    ORDER BY name ASC
  `).all() as LLMModel[];

  // Format installed models for frontend
  const installed = installedModels.map((model) => ({
    id: model.id,
    name: model.name,
    version: model.version || 'latest',
    provider: model.provider || 'local',
    huggingfaceModelId: model.huggingface_model_id,
    isLocal: Boolean(model.is_local),
    isEnabled: Boolean(model.is_enabled),
    downloadStatus: model.download_status,
    diskSizeBytes: model.disk_size_bytes,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
  }));

  // Simulated available models from Hugging Face
  // In production, this would call the Hugging Face API
  const available: AvailableModel[] = [
    {
      id: 'meta-llama/Llama-3.2-3B-Instruct',
      name: 'Llama 3.2 3B Instruct',
      version: '3.2',
      provider: 'huggingface',
      description: 'Meta\'s latest instruction-tuned Llama model, optimized for chat and instruction following',
      downloads: 1250000,
      likes: 4200,
      lastUpdated: '2024-12-01',
      estimatedSize: '6.4 GB',
      taskType: 'text-generation',
    },
    {
      id: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      name: 'Twitter RoBERTa Sentiment',
      version: 'latest',
      provider: 'huggingface',
      description: 'RoBERTa model fine-tuned on Twitter data for sentiment analysis',
      downloads: 890000,
      likes: 1850,
      lastUpdated: '2024-09-15',
      estimatedSize: '500 MB',
      taskType: 'text-classification',
    },
    {
      id: 'j-hartmann/emotion-english-distilroberta-base',
      name: 'Emotion English DistilRoBERTa',
      version: 'base',
      provider: 'huggingface',
      description: 'DistilRoBERTa fine-tuned for emotion classification (6 emotions)',
      downloads: 650000,
      likes: 1200,
      lastUpdated: '2024-08-20',
      estimatedSize: '330 MB',
      taskType: 'text-classification',
    },
    {
      id: 'SamLowe/roberta-base-go_emotions',
      name: 'RoBERTa GoEmotions',
      version: 'base',
      provider: 'huggingface',
      description: 'RoBERTa trained on Google\'s GoEmotions dataset (27 emotions + neutral)',
      downloads: 520000,
      likes: 980,
      lastUpdated: '2024-07-10',
      estimatedSize: '500 MB',
      taskType: 'text-classification',
    },
    {
      id: 'finiteautomata/bertweet-base-sentiment-analysis',
      name: 'BERTweet Sentiment Analysis',
      version: 'base',
      provider: 'huggingface',
      description: 'BERTweet pre-trained model for English tweets, fine-tuned for sentiment',
      downloads: 380000,
      likes: 750,
      lastUpdated: '2024-06-05',
      estimatedSize: '540 MB',
      taskType: 'text-classification',
    },
  ];

  // Filter out models that are already installed
  const installedHuggingFaceIds = new Set(
    installedModels
      .filter((m) => m.huggingface_model_id)
      .map((m) => m.huggingface_model_id)
  );

  const availableFiltered = available.filter(
    (m) => !installedHuggingFaceIds.has(m.id)
  );

  res.json({
    installed,
    available: availableFiltered,
  });
});

// POST /api/admin/models/download
router.post('/models/download', (req, res) => {
  const { modelId } = req.body;
  // TODO: Implement model download
  res.json({ success: true, message: `Download started for ${modelId}` });
});

// PUT /api/admin/models/:id
router.put('/models/:id', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;
  // TODO: Implement model enable/disable
  res.json({ success: true, message: `Model ${id} ${enabled ? 'enabled' : 'disabled'}` });
});

// POST /api/admin/reanalyze
router.post('/reanalyze', (_req, res) => {
  // TODO: Implement force re-analysis
  res.json({ success: true, message: 'Re-analysis started' });
});

// GET /api/admin/errors
router.get('/errors', (_req, res) => {
  // TODO: Implement error log fetching
  res.json({ errors: [] });
});

// GET /api/admin/errors/stats
router.get('/errors/stats', (_req, res) => {
  // TODO: Implement error statistics
  res.json({
    hourly: [],
    daily: [],
    byType: {},
  });
});

// PUT /api/admin/theme
router.put('/theme', (req, res) => {
  const theme = req.body;
  // TODO: Implement theme update
  console.log('Theme update:', theme);
  res.json({ success: true, message: 'Theme updated' });
});

// GET /api/admin/backup/status
router.get('/backup/status', (_req, res) => {
  // TODO: Implement backup status
  res.json({
    lastBackup: null,
    inProgress: false,
  });
});

// POST /api/admin/backup/trigger
router.post('/backup/trigger', (_req, res) => {
  // TODO: Implement backup triggering
  res.json({ success: true, message: 'Backup started' });
});

export default router;
