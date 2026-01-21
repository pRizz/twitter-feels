const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'data', 'twitter_feels.db'));

// Get a tweet with its sentiment analyses
const tweet = db.prepare(`
  SELECT t.id, t.content, t.tweet_timestamp,
         sa.emotion_scores, sa.llm_model_id
  FROM tweets t
  JOIN sentiment_analyses sa ON sa.tweet_id = t.id
  LIMIT 1
`).get();

console.log('Tweet with emotions:', JSON.stringify(tweet, null, 2));

// Also get the configured emotion colors
const config = db.prepare(`SELECT value FROM configurations WHERE key = 'emotions'`).get();
console.log('\nEmotion colors configuration:', config?.value);
