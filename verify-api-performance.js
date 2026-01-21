// Script to verify API response times are under 500ms
// Feature #235: API responses are efficient

const endpoints = [
  // Public API endpoints
  { name: 'Health', url: 'http://localhost:3001/api/health' },
  { name: 'Dashboard (default)', url: 'http://localhost:3001/api/dashboard' },
  { name: 'Dashboard (weekly)', url: 'http://localhost:3001/api/dashboard?timeBucket=weekly&modelId=combined' },
  { name: 'Dashboard (monthly)', url: 'http://localhost:3001/api/dashboard?timeBucket=monthly&modelId=combined' },
  { name: 'Dashboard (all_time)', url: 'http://localhost:3001/api/dashboard?timeBucket=all_time&modelId=combined' },
  { name: 'Models', url: 'http://localhost:3001/api/models' },
  { name: 'Users list', url: 'http://localhost:3001/api/users' },
  { name: 'User detail (id=4)', url: 'http://localhost:3001/api/users/4' },
  { name: 'User tweets (id=4)', url: 'http://localhost:3001/api/users/4/tweets' },
  { name: 'User trends (id=4)', url: 'http://localhost:3001/api/users/4/trends?timeBucket=daily' },
  { name: 'Tweet detail (id=52)', url: 'http://localhost:3001/api/tweets/52' },
  { name: 'Leaderboards', url: 'http://localhost:3001/api/leaderboards' },
  { name: 'Aggregations', url: 'http://localhost:3001/api/aggregations' },
  { name: 'CSRF Token', url: 'http://localhost:3001/api/csrf-token' },
];

// Admin endpoints require authentication - we'll test these separately
const adminEndpoints = [
  { name: 'Admin Me', url: 'http://localhost:3001/api/admin/me' },
  { name: 'Admin Crawler Status', url: 'http://localhost:3001/api/admin/crawler/status' },
  { name: 'Admin Users', url: 'http://localhost:3001/api/admin/users' },
  { name: 'Admin Settings', url: 'http://localhost:3001/api/admin/settings' },
  { name: 'Admin Models', url: 'http://localhost:3001/api/admin/models' },
  { name: 'Admin Theme', url: 'http://localhost:3001/api/admin/theme' },
  { name: 'Admin Errors', url: 'http://localhost:3001/api/admin/errors' },
];

const THRESHOLD_MS = 500;

async function measureEndpoint(endpoint, cookie = null) {
  const start = performance.now();
  try {
    const options = cookie ? { headers: { 'Cookie': cookie } } : {};
    const response = await fetch(endpoint.url, options);
    const end = performance.now();
    const duration = end - start;
    const status = response.status;
    const ok = response.ok;

    // Get response size
    const text = await response.text();
    const size = text.length;

    return {
      name: endpoint.name,
      url: endpoint.url,
      duration: Math.round(duration * 100) / 100,
      status,
      ok,
      size,
      passed: duration < THRESHOLD_MS
    };
  } catch (error) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      error: error.message,
      passed: false
    };
  }
}

async function login() {
  // Get CSRF token first
  const csrfResponse = await fetch('http://localhost:3001/api/csrf-token', {
    credentials: 'include'
  });
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;
  const csrfCookie = csrfResponse.headers.get('set-cookie');

  // Login
  const loginResponse = await fetch('http://localhost:3001/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': csrfCookie || ''
    },
    body: JSON.stringify({ username: 'admin', password: 'admin123456!' }),
    credentials: 'include'
  });

  if (!loginResponse.ok) {
    console.log('Login failed:', await loginResponse.text());
    return null;
  }

  const setCookie = loginResponse.headers.get('set-cookie');
  return setCookie;
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('API Performance Test - Feature #235');
  console.log('Threshold: < 500ms per request');
  console.log('='.repeat(80));
  console.log('');

  const results = [];

  // Test public endpoints
  console.log('--- PUBLIC API ENDPOINTS ---');
  for (const endpoint of endpoints) {
    const result = await measureEndpoint(endpoint);
    results.push(result);

    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const timeStr = result.error ? 'ERROR' : `${result.duration}ms`;
    const sizeStr = result.size ? `(${(result.size / 1024).toFixed(1)}KB)` : '';

    console.log(`${status} | ${endpoint.name.padEnd(25)} | ${timeStr.padStart(10)} ${sizeStr}`);

    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }
  }

  console.log('');
  console.log('--- ADMIN API ENDPOINTS (authenticated) ---');

  // Login and get session cookie
  const sessionCookie = await login();
  if (sessionCookie) {
    for (const endpoint of adminEndpoints) {
      const result = await measureEndpoint(endpoint, sessionCookie);
      results.push(result);

      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const timeStr = result.error ? 'ERROR' : `${result.duration}ms`;
      const sizeStr = result.size ? `(${(result.size / 1024).toFixed(1)}KB)` : '';

      console.log(`${status} | ${endpoint.name.padEnd(25)} | ${timeStr.padStart(10)} ${sizeStr}`);

      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
    }
  } else {
    console.log('⚠️  Could not authenticate - skipping admin endpoints');
  }

  console.log('');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;
  const maxTime = Math.max(...results.filter(r => r.duration).map(r => r.duration));
  const avgTime = results.filter(r => r.duration).reduce((a, b) => a + b.duration, 0) / results.filter(r => r.duration).length;

  console.log(`Results: ${passed}/${total} endpoints passed (<${THRESHOLD_MS}ms)`);
  console.log(`Max response time: ${maxTime.toFixed(2)}ms`);
  console.log(`Average response time: ${avgTime.toFixed(2)}ms`);

  if (allPassed) {
    console.log('✅ ALL API ENDPOINTS ARE EFFICIENT (< 500ms)');
  } else {
    console.log('❌ SOME ENDPOINTS EXCEEDED 500ms THRESHOLD');
    const failed = results.filter(r => !r.passed);
    console.log('Failed endpoints:');
    failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.duration || 'error'}ms`);
    });
  }

  console.log('='.repeat(80));

  // Output summary JSON
  console.log('');
  console.log('Summary JSON:');
  console.log(JSON.stringify({
    threshold: THRESHOLD_MS,
    passed,
    total,
    allPassed,
    maxTime: Math.round(maxTime * 100) / 100,
    avgTime: Math.round(avgTime * 100) / 100,
    results: results.map(r => ({
      name: r.name,
      duration: r.duration,
      passed: r.passed
    }))
  }, null, 2));
}

runTests();
