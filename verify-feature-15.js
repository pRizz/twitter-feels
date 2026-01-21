// Verification script for Feature #15: Admin API endpoints require authentication
// This script tests all admin endpoints to ensure they return 401 without auth

const http = require('http');

const adminEndpoints = [
  // GET endpoints
  { method: 'GET', path: '/api/admin/settings' },
  { method: 'GET', path: '/api/admin/crawler/status' },
  { method: 'GET', path: '/api/admin/users' },
  { method: 'GET', path: '/api/admin/models' },
  { method: 'GET', path: '/api/admin/errors' },
  { method: 'GET', path: '/api/admin/errors/stats' },
  { method: 'GET', path: '/api/admin/theme' },
  { method: 'GET', path: '/api/admin/backup/status' },
  { method: 'GET', path: '/api/admin/backup/list' },
  { method: 'GET', path: '/api/admin/config/export' },
  { method: 'GET', path: '/api/admin/models/download/progress/1' },
];

// Public endpoints that should work without auth
const publicEndpoints = [
  { method: 'GET', path: '/api/dashboard' },
  { method: 'GET', path: '/api/users' },
  { method: 'GET', path: '/api/models' },
  { method: 'GET', path: '/api/leaderboards' },
];

async function testEndpoint(method, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body = null;
        try {
          body = JSON.parse(data);
        } catch (e) {
          body = data;
        }
        resolve({
          statusCode: res.statusCode,
          body: body,
          hasSensitiveData: checkForSensitiveData(body),
        });
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 0, error: e.message });
    });

    req.end();
  });
}

function checkForSensitiveData(body) {
  if (!body || typeof body !== 'object') return false;

  const bodyStr = JSON.stringify(body).toLowerCase();

  // Check for sensitive fields that should not be returned in 401 responses
  const sensitivePatterns = [
    'password',
    'secretaccesskey',
    'token',
    'apikey',
    'api_key',
    'credentials',
  ];

  for (const pattern of sensitivePatterns) {
    if (bodyStr.includes(pattern) && !bodyStr.includes('csrf')) {
      // CSRF token mentions are OK, but not actual secret values
      if (bodyStr.includes(`"${pattern}":`)) {
        return true;
      }
    }
  }

  return false;
}

async function main() {
  console.log('========================================');
  console.log('Feature #15 Verification');
  console.log('Admin API endpoints require authentication');
  console.log('========================================\n');

  let allPassed = true;

  console.log('--- ADMIN ENDPOINTS (Should return 401) ---\n');

  for (const endpoint of adminEndpoints) {
    const result = await testEndpoint(endpoint.method, endpoint.path);
    const passed = result.statusCode === 401;
    const noSensitiveData = !result.hasSensitiveData;

    const status = passed && noSensitiveData ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${endpoint.method} ${endpoint.path}`);
    console.log(`  Status: ${result.statusCode} (expected: 401)`);
    console.log(`  No sensitive data: ${noSensitiveData}`);

    if (result.body && result.body.error) {
      console.log(`  Error message: ${result.body.error}`);
    }

    if (!passed || !noSensitiveData) {
      allPassed = false;
      if (result.body) {
        console.log(`  Response: ${JSON.stringify(result.body).substring(0, 100)}...`);
      }
    }
    console.log('');
  }

  console.log('\n--- PUBLIC ENDPOINTS (Should return 200) ---\n');

  for (const endpoint of publicEndpoints) {
    const result = await testEndpoint(endpoint.method, endpoint.path);
    const passed = result.statusCode === 200;

    const status = passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${endpoint.method} ${endpoint.path}`);
    console.log(`  Status: ${result.statusCode} (expected: 200)`);

    if (!passed) {
      allPassed = false;
    }
    console.log('');
  }

  console.log('========================================');
  if (allPassed) {
    console.log('✓ ALL TESTS PASSED');
    console.log('Feature #15 is verified!');
  } else {
    console.log('✗ SOME TESTS FAILED');
    console.log('Feature #15 needs investigation.');
  }
  console.log('========================================');

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
