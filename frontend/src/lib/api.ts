// API utility functions with CSRF protection

const API_BASE_URL = 'http://localhost:3001';
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// Read CSRF token from cookie
function getCsrfToken(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Fetch the CSRF token from the server (for initial SPA load)
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  return null;
}

// Generic fetch wrapper that automatically includes CSRF token
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Get headers from options or create new object
  const headers = new Headers(options.headers || {});

  // Include CSRF token for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  // Set Content-Type to JSON if body exists and Content-Type not already set
  // The body is already JSON stringified by api.post/put/patch
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies for session
  });
}

// Convenience methods
export const api = {
  get: (url: string, options: RequestInit = {}) =>
    apiFetch(url, { ...options, method: 'GET' }),

  post: (url: string, body?: unknown, options: RequestInit = {}) =>
    apiFetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (url: string, body?: unknown, options: RequestInit = {}) =>
    apiFetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: (url: string, body?: unknown, options: RequestInit = {}) =>
    apiFetch(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (url: string, options: RequestInit = {}) =>
    apiFetch(url, { ...options, method: 'DELETE' }),
};
