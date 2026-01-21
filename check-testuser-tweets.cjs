const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/data/twitter_feels.db');

// Find testuser123's ID (table is twitter_users, not tracked_users)
const user = db.prepare('SELECT id, username FROM twitter_users WHERE username = ?').get('testuser123');
console.log('User:', JSON.stringify(user));

if (user) {
  // Count tweets for this user (column is twitter_user_id)
  const tweets = db.prepare('SELECT COUNT(*) as count FROM tweets WHERE twitter_user_id = ?').get(user.id);
  console.log('Tweet count for testuser123:', tweets.count);

  // Get tweet IDs
  const tweetList = db.prepare('SELECT id FROM tweets WHERE twitter_user_id = ?').all(user.id);
  const tweetIds = tweetList.map(t => t.id);
  console.log('Tweet IDs:', tweetIds.slice(0, 5).join(', ') + (tweetIds.length > 5 ? '...' : ''));

  // Count sentiment_analyses for this user's tweets
  if (tweetIds.length > 0) {
    const placeholders = tweetIds.map(() => '?').join(',');
    const analyses = db.prepare(`SELECT COUNT(*) as count FROM sentiment_analyses WHERE tweet_id IN (${placeholders})`).get(...tweetIds);
    console.log('Sentiment analyses count:', analyses.count);
  }
} else {
  console.log('User testuser123 not found');
}
db.close();
