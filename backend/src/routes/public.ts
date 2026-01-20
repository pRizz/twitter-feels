import { Router } from 'express';

const router = Router();

// GET /api/dashboard - Main dashboard data
router.get('/dashboard', (_req, res) => {
  // TODO: Implement actual dashboard data fetching
  res.json({
    lastUpdated: new Date().toISOString(),
    gauges: [],
    leaderboards: [],
    stats: {
      totalUsers: 0,
      totalTweets: 0,
      totalAnalyses: 0,
    },
  });
});

// GET /api/users - List tracked Twitter users
router.get('/users', (_req, res) => {
  // TODO: Implement user listing
  res.json({ users: [] });
});

// GET /api/users/:id - User detail
router.get('/users/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Implement user detail fetching
  res.json({
    id,
    username: '',
    displayName: '',
    aggregations: {},
    message: 'User detail endpoint - to be implemented',
  });
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
  // TODO: Implement tweet detail fetching
  res.json({
    id,
    content: '',
    emotions: {},
    message: 'Tweet detail endpoint - to be implemented',
  });
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
