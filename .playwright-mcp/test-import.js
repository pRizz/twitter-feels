const http = require('http');

let sessionCookie = null;

function makeRequest(options, postData) {
  return new Promise((resolve) => {
    if (sessionCookie) {
      options.headers = options.headers || {};
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(options, (res) => {
      let body = '';

      // Capture session cookie
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        for (const cookie of cookies) {
          if (cookie.startsWith('connect.sid=')) {
            sessionCookie = cookie.split(';')[0];
          }
        }
      }

      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function login() {
  const data = JSON.stringify({ username: 'admin', password: 'admin' });
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, data);
  console.log('Login:', result.status, result.body);
  return result.status === 200;
}

async function testImport(data, description) {
  const postData = JSON.stringify(data);
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/config/import',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  console.log(`\n=== ${description} ===`);
  console.log('Status:', result.status);
  console.log('Response:', result.body);
  return result;
}

async function getSettings() {
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/settings',
    method: 'GET'
  });
  console.log('\n=== Current Settings ===');
  console.log('Status:', result.status);
  console.log('Response:', result.body);
  return result;
}

async function main() {
  // Login first
  console.log('Logging in...');
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('Login failed!');
    return;
  }

  // Get current settings before tests
  await getSettings();

  // Test 1: Missing version
  await testImport(
    { crawler: { intervalHours: 5 } },
    'Test 1: Config without version field'
  );

  // Test 2: Unsupported version
  await testImport(
    { version: '2.0', crawler: { intervalHours: 5 } },
    'Test 2: Unsupported version 2.0'
  );

  // Test 3: Invalid crawler values
  await testImport(
    { version: '1.0', crawler: { intervalHours: 'not_a_number', historyDepthDays: 999999 } },
    'Test 3: Invalid crawler values (string intervalHours, out-of-range historyDepthDays)'
  );

  // Test 4: Invalid emotion color
  await testImport(
    { version: '1.0', emotions: { happy: { color: 'not-a-valid-color' } } },
    'Test 4: Invalid emotion color format'
  );

  // Test 5: Gauges as string instead of array
  await testImport(
    { version: '1.0', gauges: 'not_an_array' },
    'Test 5: Gauges field is string instead of array'
  );

  // Test 6: Gauge missing required fields
  await testImport(
    { version: '1.0', gauges: [{ name: 'Test Gauge' }] },
    'Test 6: Gauge missing lowLabel, highLabel, emotions'
  );

  // Test 7: Empty object
  await testImport(
    {},
    'Test 7: Empty config object'
  );

  // Get settings after tests to verify nothing changed
  console.log('\n\n=== VERIFYING SETTINGS UNCHANGED ===');
  await getSettings();
}

main();
