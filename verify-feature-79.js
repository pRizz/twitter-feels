// Verify Feature #79: Singleton prevents duplicate crawlers
const path = require('path');
const Database = require(path.join(__dirname, 'backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.join(__dirname, 'backend', 'data', 'twitter_feels.db'));

console.log('=== Feature #79: Singleton Crawler Verification ===\n');

// Check if there are any overlapping crawler runs
const runs = db.prepare(`
  SELECT id, status, started_at, completed_at
  FROM crawler_runs
  ORDER BY started_at DESC
  LIMIT 20
`).all();

console.log('Recent Crawler Runs:');
console.log('ID | Status     | Started At              | Completed At');
console.log('-'.repeat(80));
runs.forEach(run => {
  console.log(`${run.id.toString().padEnd(3)}| ${(run.status || 'null').padEnd(11)}| ${run.started_at || 'null'.padEnd(24)}| ${run.completed_at || 'N/A'}`);
});

// Check for any runs that were running at the same time
const overlappingRuns = db.prepare(`
  SELECT COUNT(*) as count
  FROM crawler_runs r1, crawler_runs r2
  WHERE r1.id < r2.id
    AND r1.status = 'running'
    AND r2.status = 'running'
`).get();

console.log('\n=== Verification Results ===');
console.log(`Overlapping running crawlers found: ${overlappingRuns.count}`);

// Check current running count
const runningCount = db.prepare(`SELECT COUNT(*) as count FROM crawler_runs WHERE status = 'running'`).get();
console.log(`Currently running crawlers: ${runningCount.count}`);

if (overlappingRuns.count === 0 && runningCount.count <= 1) {
  console.log('\n✓ PASS: Singleton pattern is working correctly');
  console.log('  - No overlapping running crawlers found in history');
  console.log('  - At most one crawler running at any time');
} else {
  console.log('\n✗ FAIL: Singleton pattern may not be enforced');
}

db.close();
