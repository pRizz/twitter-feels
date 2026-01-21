const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'data', 'twitter_feels.db'));

// Get tweet 52 with its sentiment analyses
const tweet = db.prepare(`
  SELECT t.id, t.content,
         sa.emotion_scores
  FROM tweets t
  JOIN sentiment_analyses sa ON sa.tweet_id = t.id
  WHERE t.id = 52
`).get();

console.log('Tweet 52 emotions from DB:', tweet?.emotion_scores);
