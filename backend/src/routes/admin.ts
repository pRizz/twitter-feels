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

// GET /api/admin/me - Check authentication status (no auth required)
router.get('/me', (req, res) => {
  if (req.session.adminId) {
    res.json({
      authenticated: true,
      username: req.session.adminUsername,
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// All routes below require authentication
router.use(requireAuth);

// Password complexity validation helper
interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

function validatePasswordComplexity(password: string): PasswordValidation {
  const errors: string[] = [];

  // Minimum 12 characters
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// PUT /api/admin/change-password
router.put('/change-password', (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate required fields
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: 'Current password, new password, and confirmation are required',
    });
  }

  // Check that new password and confirmation match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      error: 'New password and confirmation do not match',
    });
  }

  // Validate password complexity
  const validation = validatePasswordComplexity(newPassword);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Password does not meet complexity requirements',
      details: validation.errors,
    });
  }

  try {
    // Get the current admin user
    const adminId = req.session.adminId;
    const adminUsername = req.session.adminUsername || 'admin';

    let admin = db.prepare('SELECT id, password_hash FROM admin_users WHERE id = ?').get(adminId) as
      | { id: number; password_hash: string }
      | undefined;

    // If admin user doesn't exist, create one (for demo/development purposes)
    if (!admin) {
      db.prepare(`
        INSERT INTO admin_users (id, username, password_hash)
        VALUES (?, ?, ?)
      `).run(adminId, adminUsername, 'placeholder_hash');

      admin = db.prepare('SELECT id, password_hash FROM admin_users WHERE id = ?').get(adminId) as
        | { id: number; password_hash: string }
        | undefined;
    }

    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // In a real implementation, we would:
    // 1. Hash the currentPassword and compare with admin.password_hash
    // 2. Hash the newPassword before storing
    // For now, we do a simple comparison (placeholder implementation)
    // TODO: Implement proper password hashing with bcrypt

    // For demo purposes, accept any current password if user is authenticated
    // In production, this should verify the current password hash
    console.log('Password change requested for admin:', req.session.adminUsername);

    // Hash and store the new password
    // In production: const newHash = await bcrypt.hash(newPassword, 12);
    const newHash = `hashed_${newPassword}`; // Placeholder - use bcrypt in production

    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?
      WHERE id = ?
    `).run(newHash, adminId);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password', details: error instanceof Error ? error.message : String(error) });
  }
});

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

// Twitter handle validation helper
function validateTwitterHandle(handle: string): { isValid: boolean; error?: string; username: string } {
  const trimmed = handle.trim();

  if (!trimmed) {
    return { isValid: false, error: 'Twitter handle is required', username: '' };
  }

  // Remove leading @ if present
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  if (!username) {
    return { isValid: false, error: 'Twitter handle is required', username: '' };
  }

  // Check length (1-15 characters)
  if (username.length > 15) {
    return { isValid: false, error: 'Handle must be 15 characters or less', username };
  }

  // Check for valid characters (alphanumeric and underscore only)
  const validPattern = /^[A-Za-z0-9_]+$/;
  if (!validPattern.test(username)) {
    return { isValid: false, error: 'Handle can only contain letters, numbers, and underscores', username };
  }

  return { isValid: true, username };
}

// POST /api/admin/users - Add tracked user
router.post('/users', (req, res) => {
  const { handle, displayName } = req.body;

  if (!handle) {
    return res.status(400).json({ error: 'Twitter handle is required' });
  }

  // Validate handle format
  const validation = validateTwitterHandle(handle);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM twitter_users WHERE username = ?').get(validation.username);
    if (existing) {
      return res.status(409).json({ error: 'User already being tracked' });
    }

    // Add new user (in production, this would call Twitter API to get user data)
    const username = validation.username;
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
  try {
    // Fetch crawler config
    const crawlerConfigResult = db.prepare(
      `SELECT value FROM configurations WHERE key = 'crawler'`
    ).get() as { value: string } | undefined;
    const crawlerConfig = crawlerConfigResult
      ? JSON.parse(crawlerConfigResult.value)
      : { intervalHours: 1, historyDepthDays: 90, rateLimitPer15Min: 450 };

    // Fetch S3 backup config
    const s3ConfigResult = db.prepare(
      `SELECT value FROM configurations WHERE key = 's3_backup'`
    ).get() as { value: string } | undefined;
    const s3Config = s3ConfigResult
      ? JSON.parse(s3ConfigResult.value)
      : {
          enabled: false,
          bucketName: '',
          region: 'us-east-1',
          accessKeyId: '',
          secretAccessKey: '',
          schedule: 'daily',
          retentionDays: 30,
        };

    res.json({
      crawler: {
        intervalHours: crawlerConfig.intervalHours ?? 1,
        historyDepthDays: crawlerConfig.historyDepthDays ?? 90,
        rateLimitPer15Min: crawlerConfig.rateLimitPer15Min ?? 450,
      },
      backup: {
        enabled: s3Config.enabled ?? false,
        bucketName: s3Config.bucketName ?? '',
        region: s3Config.region ?? 'us-east-1',
        accessKeyId: s3Config.accessKeyId ?? '',
        // Never return the full secret, only indicate if it's set
        secretAccessKeySet: Boolean(s3Config.secretAccessKey),
        schedule: s3Config.schedule ?? 'daily',
        retentionDays: s3Config.retentionDays ?? 30,
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  const { crawler, backup } = req.body;

  // Validate crawler settings if provided
  if (crawler) {
    const errors: string[] = [];

    if (crawler.intervalHours !== undefined) {
      const interval = Number(crawler.intervalHours);
      if (isNaN(interval) || interval < 1 || interval > 168) {
        errors.push('Crawl interval must be between 1 and 168 hours');
      }
    }

    if (crawler.historyDepthDays !== undefined) {
      const depth = Number(crawler.historyDepthDays);
      if (isNaN(depth) || depth < 1 || depth > 365) {
        errors.push('History depth must be between 1 and 365 days');
      }
    }

    if (crawler.rateLimitPer15Min !== undefined) {
      const limit = Number(crawler.rateLimitPer15Min);
      if (isNaN(limit) || limit < 1 || limit > 900) {
        errors.push('Rate limit must be between 1 and 900 requests per 15 minutes');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }
  }

  // Validate backup settings if provided
  if (backup) {
    const errors: string[] = [];

    if (backup.enabled && !backup.bucketName && backup.bucketName !== undefined) {
      errors.push('S3 bucket name is required when backups are enabled');
    }

    if (backup.retentionDays !== undefined) {
      const retention = Number(backup.retentionDays);
      if (isNaN(retention) || retention < 1 || retention > 365) {
        errors.push('Retention period must be between 1 and 365 days');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }
  }

  try {
    // Update crawler settings if provided
    if (crawler) {
      const existingCrawlerResult = db.prepare(
        `SELECT value FROM configurations WHERE key = 'crawler'`
      ).get() as { value: string } | undefined;
      const existingCrawler = existingCrawlerResult
        ? JSON.parse(existingCrawlerResult.value)
        : {};

      const newCrawlerConfig = {
        ...existingCrawler,
        intervalHours: crawler.intervalHours ?? existingCrawler.intervalHours ?? 1,
        historyDepthDays: crawler.historyDepthDays ?? existingCrawler.historyDepthDays ?? 90,
        rateLimitPer15Min: crawler.rateLimitPer15Min ?? existingCrawler.rateLimitPer15Min ?? 450,
      };

      db.prepare(`
        INSERT INTO configurations (key, value, updated_at)
        VALUES ('crawler', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `).run(JSON.stringify(newCrawlerConfig), JSON.stringify(newCrawlerConfig));
    }

    // Update S3 backup settings if provided
    if (backup) {
      const existingS3Result = db.prepare(
        `SELECT value FROM configurations WHERE key = 's3_backup'`
      ).get() as { value: string } | undefined;
      const existingS3 = existingS3Result
        ? JSON.parse(existingS3Result.value)
        : {};

      const newS3Config = {
        enabled: backup.enabled ?? existingS3.enabled ?? false,
        bucketName: backup.bucketName ?? existingS3.bucketName ?? '',
        region: backup.region ?? existingS3.region ?? 'us-east-1',
        accessKeyId: backup.accessKeyId ?? existingS3.accessKeyId ?? '',
        // Only update secretAccessKey if a new one is provided
        secretAccessKey: backup.secretAccessKey || existingS3.secretAccessKey || '',
        schedule: backup.schedule ?? existingS3.schedule ?? 'daily',
        retentionDays: backup.retentionDays ?? existingS3.retentionDays ?? 30,
      };

      db.prepare(`
        INSERT INTO configurations (key, value, updated_at)
        VALUES ('s3_backup', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `).run(JSON.stringify(newS3Config), JSON.stringify(newS3Config));
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
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

  if (!modelId) {
    return res.status(400).json({ error: 'Model ID is required' });
  }

  // Available models from Hugging Face (same as in GET /models)
  const availableModels: Record<string, { name: string; version: string; estimatedSize: number }> = {
    'meta-llama/Llama-3.2-3B-Instruct': { name: 'Llama 3.2 3B Instruct', version: '3.2', estimatedSize: 6400000000 },
    'cardiffnlp/twitter-roberta-base-sentiment-latest': { name: 'Twitter RoBERTa Sentiment', version: 'latest', estimatedSize: 500000000 },
    'j-hartmann/emotion-english-distilroberta-base': { name: 'Emotion English DistilRoBERTa', version: 'base', estimatedSize: 330000000 },
    'SamLowe/roberta-base-go_emotions': { name: 'RoBERTa GoEmotions', version: 'base', estimatedSize: 500000000 },
    'finiteautomata/bertweet-base-sentiment-analysis': { name: 'BERTweet Sentiment Analysis', version: 'base', estimatedSize: 540000000 },
  };

  const modelInfo = availableModels[modelId];
  if (!modelInfo) {
    return res.status(404).json({ error: 'Model not found in available models' });
  }

  try {
    // Check if model already exists
    const existingModel = db.prepare(`
      SELECT id, download_status FROM llm_models WHERE huggingface_model_id = ?
    `).get(modelId) as { id: number; download_status: string } | undefined;

    if (existingModel) {
      if (existingModel.download_status === 'ready') {
        return res.status(409).json({ error: 'Model is already downloaded' });
      }
      if (existingModel.download_status === 'downloading') {
        return res.status(409).json({ error: 'Model is already being downloaded' });
      }
      // If status is 'error' or 'not_downloaded', allow re-download
      db.prepare(`
        UPDATE llm_models SET download_status = 'downloading', updated_at = datetime('now')
        WHERE id = ?
      `).run(existingModel.id);

      // Simulate download completion after 3 seconds
      setTimeout(() => {
        db.prepare(`
          UPDATE llm_models
          SET download_status = 'ready', is_enabled = 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(existingModel.id);
      }, 3000);

      return res.json({
        success: true,
        message: `Download started for ${modelInfo.name}`,
        modelId: existingModel.id,
      });
    }

    // Insert new model with 'downloading' status
    const result = db.prepare(`
      INSERT INTO llm_models (name, version, provider, huggingface_model_id, is_local, is_enabled, download_status, disk_size_bytes)
      VALUES (?, ?, 'huggingface', ?, 0, 0, 'downloading', ?)
    `).run(modelInfo.name, modelInfo.version, modelId, modelInfo.estimatedSize);

    const newModelId = result.lastInsertRowid;

    // Simulate download completion after 3 seconds (in production, this would be actual download)
    setTimeout(() => {
      db.prepare(`
        UPDATE llm_models
        SET download_status = 'ready', is_enabled = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(newModelId);
    }, 3000);

    res.json({
      success: true,
      message: `Download started for ${modelInfo.name}`,
      modelId: newModelId,
    });
  } catch (error) {
    console.error('Error starting model download:', error);
    res.status(500).json({ error: 'Failed to start model download' });
  }
});

// PUT /api/admin/models/:id
router.put('/models/:id', (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }

  try {
    // Check if model exists
    const model = db.prepare('SELECT id, name, download_status FROM llm_models WHERE id = ?').get(id) as { id: number; name: string; download_status: string } | undefined;

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Only allow enabling models that are ready
    if (enabled && model.download_status !== 'ready') {
      return res.status(400).json({ error: 'Cannot enable a model that is not downloaded' });
    }

    db.prepare(`
      UPDATE llm_models
      SET is_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(enabled ? 1 : 0, id);

    res.json({
      success: true,
      message: `Model "${model.name}" ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    console.error('Error toggling model:', error);
    res.status(500).json({ error: 'Failed to update model status' });
  }
});

// POST /api/admin/reanalyze
router.post('/reanalyze', (req, res) => {
  const { tweetId, userId, all } = req.body;

  try {
    // Check if reanalysis is already running
    const runningReanalysis = db.prepare(`
      SELECT * FROM crawler_runs
      WHERE status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `).get() as CrawlerRun | undefined;

    if (runningReanalysis) {
      return res.status(409).json({
        success: false,
        error: 'A crawler/reanalysis task is already running',
        currentRun: {
          id: runningReanalysis.id,
          startedAt: runningReanalysis.started_at,
        },
      });
    }

    let tweetsToAnalyze = 0;
    let message = '';

    if (tweetId) {
      // Re-analyze a single tweet
      const tweet = db.prepare('SELECT id FROM tweets WHERE id = ?').get(tweetId);
      if (!tweet) {
        return res.status(404).json({ error: 'Tweet not found' });
      }
      tweetsToAnalyze = 1;
      message = `Re-analysis started for tweet #${tweetId}`;
    } else if (userId) {
      // Re-analyze all tweets for a specific user
      const user = db.prepare('SELECT id, username FROM twitter_users WHERE id = ?').get(userId) as { id: number; username: string } | undefined;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { count } = db.prepare('SELECT COUNT(*) as count FROM tweets WHERE twitter_user_id = ?').get(userId) as { count: number };
      tweetsToAnalyze = count;
      message = `Re-analysis started for ${count} tweets from @${user.username}`;
    } else if (all) {
      // Re-analyze all tweets
      const { count } = db.prepare('SELECT COUNT(*) as count FROM tweets').get() as { count: number };
      tweetsToAnalyze = count;
      message = `Re-analysis started for all ${count} tweets`;
    } else {
      return res.status(400).json({ error: 'Must specify tweetId, userId, or all=true' });
    }

    // Create a reanalysis run record
    const newRun = db.prepare(`
      INSERT INTO crawler_runs (status, tweets_fetched, tweets_analyzed, errors_count)
      VALUES ('running', 0, 0, 0)
      RETURNING *
    `).get() as CrawlerRun;

    res.json({
      success: true,
      message,
      runId: newRun.id,
      tweetsToAnalyze,
      startedAt: newRun.started_at,
    });

    // Simulate reanalysis completion after a few seconds (for demo purposes)
    // In production, the Rust crawler would handle actual re-analysis
    const simulatedDuration = Math.min(tweetsToAnalyze * 500, 10000); // Max 10 seconds
    setTimeout(() => {
      db.prepare(`
        UPDATE crawler_runs
        SET status = 'completed',
            completed_at = datetime('now'),
            tweets_fetched = 0,
            tweets_analyzed = ?
        WHERE id = ?
      `).run(tweetsToAnalyze, newRun.id);
      console.log(`Re-analysis run ${newRun.id} completed (simulated): ${tweetsToAnalyze} tweets`);
    }, simulatedDuration);
  } catch (error) {
    console.error('Error triggering re-analysis:', error);
    res.status(500).json({ error: 'Failed to trigger re-analysis' });
  }
});

// Type definitions for API errors
interface ApiError {
  id: number;
  error_type: string;
  error_message: string | null;
  error_code: string | null;
  endpoint: string | null;
  occurred_at: string;
  resolved: number;
}

interface ErrorStatRow {
  period: string;
  count: number;
}

interface ErrorTypeCount {
  error_type: string;
  count: number;
}

// GET /api/admin/errors
router.get('/errors', (req, res) => {
  try {
    const { type, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build query with optional type filter
    let query = `
      SELECT id, error_type, error_message, error_code, endpoint, occurred_at, resolved
      FROM api_errors
    `;
    const params: (string | number)[] = [];

    if (type && type !== 'all') {
      query += ` WHERE error_type = ?`;
      params.push(type as string);
    }

    query += ` ORDER BY occurred_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const errors = db.prepare(query).all(...params) as ApiError[];

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM api_errors`;
    if (type && type !== 'all') {
      countQuery += ` WHERE error_type = ?`;
    }
    const countParams = type && type !== 'all' ? [type] : [];
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    // Format for frontend
    const formattedErrors = errors.map((err) => ({
      id: err.id,
      errorType: err.error_type,
      errorMessage: err.error_message,
      errorCode: err.error_code,
      endpoint: err.endpoint,
      occurredAt: err.occurred_at,
      resolved: Boolean(err.resolved),
    }));

    res.json({
      errors: formattedErrors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting error logs:', error);
    res.status(500).json({ error: 'Failed to get error logs' });
  }
});

// GET /api/admin/errors/stats
router.get('/errors/stats', (_req, res) => {
  try {
    // Get hourly error counts (last 24 hours)
    const hourlyErrors = db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00:00', occurred_at) as period,
        COUNT(*) as count
      FROM api_errors
      WHERE occurred_at >= datetime('now', '-24 hours')
      GROUP BY strftime('%Y-%m-%d %H:00:00', occurred_at)
      ORDER BY period ASC
    `).all() as ErrorStatRow[];

    // Get daily error counts (last 7 days)
    const dailyErrors = db.prepare(`
      SELECT
        date(occurred_at) as period,
        COUNT(*) as count
      FROM api_errors
      WHERE occurred_at >= datetime('now', '-7 days')
      GROUP BY date(occurred_at)
      ORDER BY period ASC
    `).all() as ErrorStatRow[];

    // Get error counts by type
    const byTypeRows = db.prepare(`
      SELECT error_type, COUNT(*) as count
      FROM api_errors
      GROUP BY error_type
      ORDER BY count DESC
    `).all() as ErrorTypeCount[];

    const byType: Record<string, number> = {};
    byTypeRows.forEach((row) => {
      byType[row.error_type] = row.count;
    });

    // Get total errors count
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM api_errors`).get() as { total: number };

    // Get unresolved errors count
    const { unresolved } = db.prepare(`SELECT COUNT(*) as unresolved FROM api_errors WHERE resolved = 0`).get() as { unresolved: number };

    // Get errors in last 24 hours
    const { last24h } = db.prepare(`
      SELECT COUNT(*) as last24h FROM api_errors
      WHERE occurred_at >= datetime('now', '-24 hours')
    `).get() as { last24h: number };

    res.json({
      hourly: hourlyErrors.map((row) => ({
        period: row.period,
        count: row.count,
      })),
      daily: dailyErrors.map((row) => ({
        period: row.period,
        count: row.count,
      })),
      byType,
      summary: {
        total,
        unresolved,
        last24h,
      },
    });
  } catch (error) {
    console.error('Error getting error stats:', error);
    res.status(500).json({ error: 'Failed to get error statistics' });
  }
});

// GET /api/admin/theme
router.get('/theme', (_req, res) => {
  try {
    // Fetch emotions config
    const emotionsResult = db.prepare(
      `SELECT value FROM configurations WHERE key = 'emotions'`
    ).get() as { value: string } | undefined;

    const emotions = emotionsResult
      ? JSON.parse(emotionsResult.value)
      : {
          happy: { color: '#FFD700' },
          sad: { color: '#4169E1' },
          angry: { color: '#FF4444' },
          fearful: { color: '#9932CC' },
          hatred: { color: '#8B0000' },
          thankful: { color: '#32CD32' },
          excited: { color: '#FF6B35' },
          hopeful: { color: '#00CED1' },
          frustrated: { color: '#FF8C00' },
          sarcastic: { color: '#BA55D3' },
          inspirational: { color: '#FFD700' },
          anxious: { color: '#708090' },
        };

    // Fetch gauges config
    const gaugesResult = db.prepare(
      `SELECT value FROM configurations WHERE key = 'gauges'`
    ).get() as { value: string } | undefined;

    const gauges = gaugesResult
      ? JSON.parse(gaugesResult.value)
      : [
          { name: 'Anger Gauge', lowLabel: 'Chill', highLabel: 'Angry', emotions: ['angry', 'frustrated', 'hatred'] },
          { name: 'Inspiration Gauge', lowLabel: 'Doomer', highLabel: 'Kurzweilian', emotions: ['inspirational', 'hopeful', 'excited'] },
          { name: 'Gratitude Gauge', lowLabel: 'Entitled', highLabel: 'Thankful', emotions: ['thankful'] },
          { name: 'Mood Gauge', lowLabel: 'Gloomy', highLabel: 'Joyful', emotions: ['happy'], invertedEmotions: ['sad'] },
          { name: 'Intensity Gauge', lowLabel: 'Zen', highLabel: 'Heated', emotions: ['angry', 'excited', 'anxious', 'frustrated'] },
          { name: 'Playfulness Gauge', lowLabel: 'Serious', highLabel: 'Comedian', emotions: ['sarcastic', 'happy', 'excited'] },
        ];

    res.json({ emotions, gauges });
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    res.status(500).json({ error: 'Failed to fetch theme settings' });
  }
});

// PUT /api/admin/theme
router.put('/theme', (req, res) => {
  const { emotions, gauges } = req.body;

  try {
    // Update emotions config if provided
    if (emotions) {
      db.prepare(`
        INSERT INTO configurations (key, value, updated_at)
        VALUES ('emotions', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `).run(JSON.stringify(emotions), JSON.stringify(emotions));
    }

    // Update gauges config if provided
    if (gauges) {
      db.prepare(`
        INSERT INTO configurations (key, value, updated_at)
        VALUES ('gauges', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
      `).run(JSON.stringify(gauges), JSON.stringify(gauges));
    }

    res.json({ success: true, message: 'Theme settings updated successfully' });
  } catch (error) {
    console.error('Error updating theme settings:', error);
    res.status(500).json({ error: 'Failed to update theme settings' });
  }
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
