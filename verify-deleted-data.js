// Verify that data for a deleted user no longer exists
const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/data/twitter_feels.db');

// The tweet IDs that belonged to the deleted user
const deletedTweetIds = [210, 211, 212, 213];
const deletedUserId = 54;

console.log('=== Verifying Deleted User Data ===');
console.log('Deleted User ID:', deletedUserId);
console.log('Deleted Tweet IDs:', deletedTweetIds.join(', '));

// Check if user still exists
const user = db.prepare('SELECT * FROM twitter_users WHERE id = ?').get(deletedUserId);
console.log('\n1. User exists:', user ? 'YES (BAD!)' : 'NO (GOOD - deleted)');

// Check if tweets still exist
const placeholders = deletedTweetIds.map(() => '?').join(',');
const existingTweets = db.prepare(`SELECT id FROM tweets WHERE id IN (${placeholders})`).all(...deletedTweetIds);
console.log('2. Tweets still exist:', existingTweets.length > 0 ? `YES - ${existingTweets.length} found (BAD!)` : 'NO (GOOD - all deleted)');

// Check if analyses still exist for those tweet IDs
const existingAnalyses = db.prepare(`SELECT id, tweet_id FROM sentiment_analyses WHERE tweet_id IN (${placeholders})`).all(...deletedTweetIds);
console.log('3. Analyses still exist:', existingAnalyses.length > 0 ? `YES - ${existingAnalyses.length} found (BAD!)` : 'NO (GOOD - all deleted)');

// Summary
console.log('\n=== Verification Result ===');
if (!user && existingTweets.length === 0 && existingAnalyses.length === 0) {
  console.log('✓ SUCCESS: All data for deleted user has been properly cleaned up!');
  console.log('  - User deleted');
  console.log('  - All tweets deleted (cascade)');
  console.log('  - All sentiment analyses deleted (cascade)');
} else {
  console.log('✗ FAILURE: Some orphaned data remains!');
  if (user) console.log('  - User still exists');
  if (existingTweets.length > 0) console.log('  - Some tweets still exist');
  if (existingAnalyses.length > 0) console.log('  - Some analyses still exist');
}

db.close();
