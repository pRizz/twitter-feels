// Final comprehensive API performance verification
// Feature #235: API responses are efficient (< 500ms)

const endpoints = [
  // Public API endpoints
  { name: 'Health Check', url: 'http://localhost:3001/api/health' },
  { name: 'Dashboard (default)', url: 'http://localhost:3001/api/dashboard' },
  { name: 'Dashboard (weekly)', url: 'http://localhost:3001/api/dashboard?timeBucket=weekly&modelId=combined' },
  { name: 'Dashboard (monthly)', url: 'http://localhost:3001/api/dashboard?timeBucket=monthly&modelId=combined' },
  { name: 'Dashboard (yearly)', url: 'http://localhost:3001/api/dashboard?timeBucket=yearly&modelId=combined' },
  { name: 'Dashboard (all_time)', url: 'http://localhost:3001/api/dashboard?timeBucket=all_time&modelId=combined' },
  { name: 'Models List', url: 'http://localhost:3001/api/models' },
  { name: 'Users List', url: 'http://localhost:3001/api/users' },
  { name: 'User Detail (id=4)', url: 'http://localhost:3001/api/users/4' },
  { name: 'User Tweets (id=4)', url: 'http://localhost:3001/api/users/4/tweets' },
  { name: 'User Tweets (page 2)', url: 'http://localhost:3001/api/users/4/tweets?page=2' },
  { name: 'User Trends (daily)', url: 'http://localhost:3001/api/users/4/trends?timeBucket=daily' },
  { name: 'User Trends (weekly)', url: 'http://localhost:3001/api/users/4/trends?timeBucket=weekly' },
  { name: 'User Trends (monthly)', url: 'http://localhost:3001/api/users/4/trends?timeBucket=monthly' },
  { name: 'Tweet Detail (id=52)', url: 'http://localhost:3001/api/tweets/52' },
  { name: 'Leaderboards', url: 'http://localhost:3001/api/leaderboards' },
  { name: 'Aggregations', url: 'http://localhost:3001/api/aggregations' },
  { name: 'CSRF Token', url: 'http://localhost:3001/api/csrf-token' },
];

const THRESHOLD_MS = 500;
const NUM_RUNS = 3;  // Run each test multiple times and take average

async function measureEndpoint(endpoint) {
  const times = [];

  for (let i = 0; i < NUM_RUNS; i++) {
    const start = performance.now();
    try {
      const response = await fetch(endpoint.url);
      const end = performance.now();
      const duration = end - start;

      if (!response.ok) {
        return {
          name: endpoint.name,
          url: endpoint.url,
          error: `HTTP ${response.status}`,
          passed: false
        };
      }

      // Read the response to ensure full transfer
      await response.text();
      times.push(duration);
    } catch (error) {
      return {
        name: endpoint.name,
        url: endpoint.url,
        error: error.message,
        passed: false
      };
    }
  }

  const avgDuration = times.reduce((a, b) => a + b, 0) / times.length;
  const minDuration = Math.min(...times);
  const maxDuration = Math.max(...times);

  return {
    name: endpoint.name,
    url: endpoint.url,
    avgDuration: Math.round(avgDuration * 100) / 100,
    minDuration: Math.round(minDuration * 100) / 100,
    maxDuration: Math.round(maxDuration * 100) / 100,
    passed: maxDuration < THRESHOLD_MS  // Strictest test: even max must be under threshold
  };
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('API Performance Verification - Feature #235');
  console.log(`Threshold: < ${THRESHOLD_MS}ms per request`);
  console.log(`Runs per endpoint: ${NUM_RUNS} (checking max response time)`);
  console.log('='.repeat(80));
  console.log('');

  const results = [];

  for (const endpoint of endpoints) {
    const result = await measureEndpoint(endpoint);
    results.push(result);

    const status = result.passed ? '✅ PASS' : '❌ FAIL';

    if (result.error) {
      console.log(`${status} | ${endpoint.name.padEnd(25)} | ERROR: ${result.error}`);
    } else {
      const avgStr = `avg: ${result.avgDuration}ms`;
      const rangeStr = `(${result.minDuration}ms - ${result.maxDuration}ms)`;
      console.log(`${status} | ${endpoint.name.padEnd(25)} | ${avgStr.padStart(15)} ${rangeStr}`);
    }
  }

  console.log('');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  const validResults = results.filter(r => r.avgDuration !== undefined);
  const maxAvgTime = Math.max(...validResults.map(r => r.avgDuration));
  const maxMaxTime = Math.max(...validResults.map(r => r.maxDuration));
  const overallAvg = validResults.reduce((a, b) => a + b.avgDuration, 0) / validResults.length;

  console.log(`Results: ${passed}/${total} endpoints passed`);
  console.log(`Overall average response time: ${overallAvg.toFixed(2)}ms`);
  console.log(`Slowest average response: ${maxAvgTime.toFixed(2)}ms`);
  console.log(`Slowest single response: ${maxMaxTime.toFixed(2)}ms`);
  console.log('');

  if (allPassed) {
    console.log('✅ ALL API ENDPOINTS ARE EFFICIENT (< 500ms)');
    console.log('');
    console.log('Feature #235 VERIFIED: API responses are efficient');
    console.log(`  - All ${total} public endpoints respond in < 500ms`);
    console.log(`  - Average response time: ${overallAvg.toFixed(2)}ms`);
    console.log(`  - Maximum response time: ${maxMaxTime.toFixed(2)}ms`);
  } else {
    console.log('❌ SOME ENDPOINTS EXCEEDED 500ms THRESHOLD');
    const failed = results.filter(r => !r.passed);
    console.log('Failed endpoints:');
    failed.forEach(r => {
      console.log(`  - ${r.name}: ${r.maxDuration || r.error}${r.maxDuration ? 'ms' : ''}`);
    });
  }

  console.log('='.repeat(80));

  return allPassed;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
});
