// CSRF Protection Middleware
// Implements the Synchronizer Token Pattern for CSRF protection

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend session type for CSRF token storage
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

// Generate a cryptographically secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to ensure a CSRF token exists in the session
// and expose it via a cookie (so frontend can read it)
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate token if not already in session
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  // Set the CSRF token as a cookie (readable by JavaScript)
  // This allows the frontend to read the token and include it in requests
  res.cookie(CSRF_COOKIE_NAME, req.session.csrfToken, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  // Also expose in response header for easy debugging
  res.setHeader('X-CSRF-Token', req.session.csrfToken);

  next();
}

// Middleware to validate CSRF token on state-changing requests
// Applies to: POST, PUT, PATCH, DELETE
export function csrfValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only validate on state-changing methods
  const exemptMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (exemptMethods.includes(req.method)) {
    return next();
  }

  // Login endpoint is exempt (user doesn't have session/token yet)
  // Logout is also exempt (destroying session anyway)
  const exemptPaths = ['/login', '/logout'];
  if (exemptPaths.some(path => req.path.endsWith(path))) {
    return next();
  }

  // Get the token from the request header
  const requestToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  // Get the expected token from the session
  const sessionToken = req.session.csrfToken;

  // Validate
  if (!sessionToken) {
    console.warn('CSRF validation failed: No session token');
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Session token not found. Please refresh the page.',
    });
  }

  if (!requestToken) {
    console.warn('CSRF validation failed: No request token header');
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'CSRF token missing from request. Ensure X-CSRF-Token header is included.',
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(requestToken, sessionToken)) {
    console.warn('CSRF validation failed: Token mismatch');
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid CSRF token. Please refresh the page and try again.',
    });
  }

  next();
}

// Timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Endpoint to get the current CSRF token (useful for SPA initial load)
export function getCsrfToken(req: Request, res: Response) {
  // Ensure token exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  res.json({
    csrfToken: req.session.csrfToken,
  });
}
