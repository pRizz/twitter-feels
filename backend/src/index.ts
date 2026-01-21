import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Load environment variables
config();

// Import routes
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

// Import CSRF middleware
import { csrfTokenMiddleware, csrfValidationMiddleware, getCsrfToken } from './middleware/csrf.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24') * 60 * 60 * 1000,
  },
}));

// Rate limiting for public API
// Note: Higher limit in development to support automated testing
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for dev/testing
  message: { error: 'Too many requests, please try again later.' },
});

// Development: Simulate network delay for testing loading states
// Use ?delay=2000 to add 2 second delay
app.use((req, _res, next) => {
  const delay = parseInt(req.query.delay as string, 10);
  if (delay && delay > 0 && delay <= 10000 && process.env.NODE_ENV !== 'production') {
    setTimeout(next, delay);
  } else {
    next();
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CSRF token generation middleware (applies to all routes after session)
app.use(csrfTokenMiddleware);

// Endpoint to get CSRF token for initial SPA load
app.get('/api/csrf-token', getCsrfToken);

// Public routes (rate limited)
app.use('/api', publicLimiter, publicRoutes);

// Admin routes (authentication required, CSRF validated)
app.use('/api/admin', csrfValidationMiddleware, adminRoutes);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Twitter Feels API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
