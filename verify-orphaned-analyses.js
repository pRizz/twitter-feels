// Verify orphaned analyses cleanup (Feature #224)
// This script checks for sentiment_analyses that reference deleted tweets/users

const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/data/twitter_feels.db');

// Check foreign keys are enabled
const fkResult = db.pragma('foreign_keys');
console.log('Foreign keys enabled:', fkResult[0].foreign_keys === 1);

// Count total records
const userCount = db.prepare('SELECT COUNT(*) as count FROM twitter_users').get().count;
const tweetCount = db.prepare('SELECT COUNT(*) as count FROM tweets').get().count;
const analysisCount = db.prepare('SELECT COUNT(*) as count FROM sentiment_analyses').get().count;

console.log('\n=== Current Database State ===');
console.log('Twitter users:', userCount);
console.log('Tweets:', tweetCount);
console.log('Sentiment analyses:', analysisCount);

// Check for orphaned tweets (tweets with no matching user)
const orphanedTweets = db.prepare(`
  SELECT t.id, t.twitter_user_id, t.content
  FROM tweets t
  LEFT JOIN twitter_users u ON t.twitter_user_id = u.id
  WHERE u.id IS NULL
`).all();

console.log('\n=== Orphaned Tweets (referencing deleted users) ===');
if (orphanedTweets.length === 0) {
  console.log('✓ No orphaned tweets found');
} else {
  console.log('✗ Found', orphanedTweets.length, 'orphaned tweets:');
  orphanedTweets.forEach(t => {
    console.log('  - Tweet ID:', t.id, 'references deleted user ID:', t.twitter_user_id);
  });
}

// Check for orphaned sentiment_analyses (analyses with no matching tweet)
const orphanedAnalyses = db.prepare(`
  SELECT sa.id, sa.tweet_id, sa.llm_model_id
  FROM sentiment_analyses sa
  LEFT JOIN tweets t ON sa.tweet_id = t.id
  WHERE t.id IS NULL
`).all();

console.log('\n=== Orphaned Sentiment Analyses (referencing deleted tweets) ===');
if (orphanedAnalyses.length === 0) {
  console.log('✓ No orphaned sentiment analyses found');
} else {
  console.log('✗ Found', orphanedAnalyses.length, 'orphaned analyses:');
  orphanedAnalyses.forEach(a => {
    console.log('  - Analysis ID:', a.id, 'references deleted tweet ID:', a.tweet_id);
  });
}

// Summary
console.log('\n=== Summary ===');
if (orphanedTweets.length === 0 && orphanedAnalyses.length === 0) {
  console.log('✓ Database is clean - no orphaned records');
} else {
  console.log('✗ Found orphaned records that need cleanup');
}

db.close();
