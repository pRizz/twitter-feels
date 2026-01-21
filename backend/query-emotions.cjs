const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'data', 'twitter_feels.db');
const db = new Database(dbPath);

// Get emotion colors from configurations table
const emotionConfig = db.prepare("SELECT value FROM configurations WHERE key = 'emotion_colors'").get();
if (emotionConfig) {
  console.log('Emotion Colors Configuration:');
  console.log(JSON.stringify(JSON.parse(emotionConfig.value), null, 2));
} else {
  console.log('No emotion_colors configuration found');
}

// Count emotions
const emotions = emotionConfig ? JSON.parse(emotionConfig.value) : {};
console.log('\nTotal emotions configured:', Object.keys(emotions).length);
console.log('Emotions:', Object.keys(emotions).join(', '));
