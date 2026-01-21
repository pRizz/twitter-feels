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
// Environment variables allow testing rate limits without code changes
// RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
// RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100 prod, 1000 dev)
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);
const rateLimitMax = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS ||
  (process.env.NODE_ENV === 'production' ? '100' : '1000'),
  10
);

const publicLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
