const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'data', 'twitter_feels.db'));

// Get total tweet count
const totalTweets = db.prepare('SELECT COUNT(*) as count FROM tweets').get();
console.log('Total tweets in database:', totalTweets.count);

// Get tweets for Sam Altman (user_id = 4)
const samaTweets = db.prepare('SELECT COUNT(*) as count FROM tweets WHERE twitter_user_id = 4').get();
console.log('Tweets for Sam Altman (user_id=4):', samaTweets.count);

// Get total sentiment analyses
const totalAnalyses = db.prepare('SELECT COUNT(*) as count FROM sentiment_analyses').get();
console.log('Total sentiment analyses:', totalAnalyses.count);

// Get analyses for Sam Altman's tweets
const samaAnalyses = db.prepare(`
  SELECT COUNT(*) as count
  FROM sentiment_analyses sa
  JOIN tweets t ON sa.tweet_id = t.id
  WHERE t.twitter_user_id = 4
`).get();
console.log('Analyses for Sam Altman:', samaAnalyses.count);

// Get 5 most recent tweets
const recentTweets = db.prepare(`
  SELECT id, tweet_id, content, tweet_timestamp, created_at
  FROM tweets
  ORDER BY created_at DESC
  LIMIT 5
`).all();
console.log('\nMost recent tweets:');
recentTweets.forEach((t, i) => {
  console.log(`${i+1}. ID: ${t.id}, Created: ${t.created_at}, Content: ${t.content?.substring(0, 50)}...`);
});

// Get 5 most recent analyses
const recentAnalyses = db.prepare(`
  SELECT sa.id, sa.tweet_id, sa.analyzed_at, t.content
  FROM sentiment_analyses sa
  JOIN tweets t ON sa.tweet_id = t.id
  ORDER BY sa.analyzed_at DESC
  LIMIT 5
`).all();
console.log('\nMost recent analyses:');
recentAnalyses.forEach((a, i) => {
  console.log(`${i+1}. Analysis ID: ${a.id}, Tweet ID: ${a.tweet_id}, Analyzed: ${a.analyzed_at}`);
});
