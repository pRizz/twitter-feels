const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/data/twitter_feels.db');

// The deleted user had ID 59 (testuser123)
const deletedUserId = 59;

// Check if user exists
const user = db.prepare('SELECT * FROM twitter_users WHERE id = ?').get(deletedUserId);
console.log('User with ID 59:', user ? 'EXISTS' : 'DELETED');

// Check if any tweets exist for this user
const tweets = db.prepare('SELECT COUNT(*) as count FROM tweets WHERE twitter_user_id = ?').get(deletedUserId);
console.log('Tweets for deleted user:', tweets.count);

// Check if any sentiment analyses exist for tweets that were for this user
// Since tweets are deleted, we check for orphaned analyses
const allTweetIds = db.prepare('SELECT id FROM tweets').all().map(t => t.id);
const analysisCount = db.prepare('SELECT COUNT(*) as count FROM sentiment_analyses').get();
console.log('Total sentiment analyses in DB:', analysisCount.count);

// Double-check: verify username doesn't exist
const userByName = db.prepare('SELECT * FROM twitter_users WHERE username = ?').get('testuser123');
console.log('User testuser123 by name:', userByName ? 'EXISTS' : 'DELETED');

// Summary
console.log('\n=== FEATURE 130 VERIFICATION ===');
if (!user && tweets.count === 0 && !userByName) {
  console.log('✅ PASS: User deleted and tweets removed');
} else {
  console.log('❌ FAIL: User or tweets still exist');
}

db.close();
