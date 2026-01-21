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
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        for (const cookie of cookies) {
          if (cookie.startsWith('connect.sid=')) {
            sessionCookie = cookie.split(';')[0];
          }
        }
      }
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

function getAdminCredentials() {
  const { ADMIN_USERNAME: adminUsername, ADMIN_PASSWORD: adminPassword } = process.env;
  if (!adminUsername || !adminPassword) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD to run admin login tests.');
  }
  return { adminUsername, adminPassword };
}

async function login() {
  const { adminUsername, adminPassword } = getAdminCredentials();
  const data = JSON.stringify({ username: adminUsername, password: adminPassword });
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
  return result.status === 200;
}

async function restoreSettings() {
  // Restore original crawler settings
  const data = JSON.stringify({
    version: '1.0',
    crawler: {
      intervalHours: 6,
      historyDepthDays: 180,
      rateLimitPer15Min: 450
    }
  });
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/config/import',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, data);
  console.log('Restore result:', result.status, result.body);
}

async function main() {
  await login();
  await restoreSettings();
}

main();
