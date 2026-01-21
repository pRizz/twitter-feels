const Database = require('/Users/peterryszkiewicz/Repos/twitter-feels/backend/node_modules/better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');

// Get all users with analysis data
const users = db.prepare('SELECT id, username, display_name FROM twitter_users WHERE is_active = 1').all();

console.log('=== Users in database ===');
console.log(users);

// Get emotion config
const emotionConfig = db.prepare("SELECT value FROM configurations WHERE key = 'emotions'").get();
const emotions = emotionConfig ? Object.keys(JSON.parse(emotionConfig.value)) : [];
console.log('\n=== Emotions configured ===');
console.log(emotions.slice(0, 6)); // First 6 emotions used in leaderboards

// Calculate scores for each emotion for all users
console.log('\n=== User scores by emotion (calculated from DB) ===');

const userScores = {};

for (const user of users) {
  const analyses = db.prepare(`
    SELECT sa.emotion_scores
    FROM sentiment_analyses sa
    JOIN tweets t ON sa.tweet_id = t.id
    WHERE t.twitter_user_id = ?
  `).all(user.id);

  userScores[user.id] = { user, scores: {} };

  for (const emotion of emotions.slice(0, 6)) {
    let sum = 0;
    let count = 0;

    for (const analysis of analyses) {
      const scores = JSON.parse(analysis.emotion_scores);
      if (typeof scores[emotion] === 'number') {
        sum += scores[emotion];
        count++;
      }
    }

    const avg = count > 0 ? Math.round(sum / count) : 0;
    userScores[user.id].scores[emotion] = avg;
  }

  console.log(`\n${user.display_name} (@${user.username}):`);
  for (const [emotion, score] of Object.entries(userScores[user.id].scores)) {
    console.log(`  ${emotion}: ${score}`);
  }
}

// Now show expected leaderboard rankings
console.log('\n=== Expected Leaderboard Rankings ===');

for (const emotion of emotions.slice(0, 6)) {
  const sorted = Object.values(userScores)
    .filter(u => u.scores[emotion] > 0)
    .sort((a, b) => b.scores[emotion] - a.scores[emotion]);

  console.log(`\n${emotion}:`);
  console.log('  Highest:', sorted.slice(0, 3).map(u => `${u.user.display_name} (${u.scores[emotion]})`).join(', '));
  console.log('  Lowest:', sorted.slice(-3).reverse().map(u => `${u.user.display_name} (${u.scores[emotion]})`).join(', '));
}

db.close();
