// Check data for a specific user
const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/data/twitter_feels.db');

// Get user by username
const username = process.argv[2] || 'testOrphanF224';
const user = db.prepare('SELECT * FROM twitter_users WHERE username = ?').get(username);

if (!user) {
  console.log('User not found:', username);
  process.exit(1);
}

console.log('=== User Info ===');
console.log('ID:', user.id);
console.log('Username:', user.username);
console.log('Display Name:', user.display_name);

// Count tweets for this user
const tweetCount = db.prepare('SELECT COUNT(*) as count FROM tweets WHERE twitter_user_id = ?').get(user.id).count;
console.log('\n=== Tweet Count ===');
console.log('Tweets for this user:', tweetCount);

// Get tweet IDs
const tweets = db.prepare('SELECT id FROM tweets WHERE twitter_user_id = ?').all(user.id);
const tweetIds = tweets.map(t => t.id);
console.log('Tweet IDs:', tweetIds.join(', '));

// Count analyses for these tweets
if (tweetIds.length > 0) {
  const placeholders = tweetIds.map(() => '?').join(',');
  const analysisCount = db.prepare(`SELECT COUNT(*) as count FROM sentiment_analyses WHERE tweet_id IN (${placeholders})`).get(...tweetIds).count;
  console.log('\n=== Analysis Count ===');
  console.log('Analyses for these tweets:', analysisCount);
}

db.close();
