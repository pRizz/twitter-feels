import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

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
  // TODO: Implement crawler status checking
  res.json({
    status: 'idle',
    lastRun: null,
    nextRun: null,
    tweetsFetched: 0,
    tweetsAnalyzed: 0,
  });
});

// POST /api/admin/crawler/trigger
router.post('/crawler/trigger', (_req, res) => {
  // TODO: Implement crawler triggering
  res.json({ success: true, message: 'Crawler started' });
});

// GET /api/admin/users - List tracked users (admin view)
router.get('/users', (_req, res) => {
  // TODO: Implement admin user listing
  res.json({ users: [] });
});

// POST /api/admin/users - Add tracked user
router.post('/users', (req, res) => {
  const { handle } = req.body;
  // TODO: Implement user addition
  res.json({ success: true, message: `User @${handle} added` });
});

// DELETE /api/admin/users/:id - Remove tracked user
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Implement user removal
  res.json({ success: true, message: `User ${id} removed` });
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
  // TODO: Implement model management listing
  res.json({
    installed: [],
    available: [],
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
