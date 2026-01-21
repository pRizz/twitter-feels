const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');

console.log('=== Verifying Elon Musk Deletion ===\n');

// Check twitter_users table
console.log('1. Twitter Users Table:');
const users = db.prepare('SELECT id, username, display_name, is_active FROM twitter_users').all();
console.log(JSON.stringify(users, null, 2));

// Check if Elon Musk exists
const elonCheck = db.prepare("SELECT COUNT(*) as count FROM twitter_users WHERE username = 'elonmusk'").get();
console.log('\nElon Musk in twitter_users:', elonCheck.count === 0 ? 'DELETED ✓' : 'STILL EXISTS ✗');

// Check tweets table for Elon's tweets (user_id 46)
const elonTweets = db.prepare("SELECT COUNT(*) as count FROM tweets WHERE twitter_user_id = 46").get();
console.log('Elon Musk tweets remaining:', elonTweets.count);

// Check sentiment_analyses for Elon's tweets
const elonAnalyses = db.prepare(`
  SELECT COUNT(*) as count FROM sentiment_analyses
  WHERE tweet_id IN (SELECT id FROM tweets WHERE twitter_user_id = 46)
`).get();
console.log('Elon Musk sentiment analyses remaining:', elonAnalyses.count);

// Check user_aggregations for Elon
const elonAggregations = db.prepare("SELECT COUNT(*) as count FROM user_aggregations WHERE twitter_user_id = 46").get();
console.log('Elon Musk user aggregations remaining:', elonAggregations.count);

console.log('\n=== Summary ===');
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM twitter_users').get();
const totalTweets = db.prepare('SELECT COUNT(*) as count FROM tweets').get();
const totalAnalyses = db.prepare('SELECT COUNT(*) as count FROM sentiment_analyses').get();
console.log('Total users:', totalUsers.count);
console.log('Total tweets:', totalTweets.count);
console.log('Total sentiment analyses:', totalAnalyses.count);

db.close();
