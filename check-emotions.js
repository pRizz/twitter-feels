const { createRequire } = require('module');
const require2 = createRequire('/Users/peterryszkiewicz/Repos/twitter-feels/backend/');
const Database = require2('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');
const result = db.prepare("SELECT value FROM configurations WHERE key='emotions'").get();
const emotions = JSON.parse(result.value);
console.log('Emotions configured:', Object.keys(emotions).length);
console.log('Emotion list:');
Object.entries(emotions).forEach(([name, config], index) => {
  console.log(`  ${index + 1}. ${name}: ${config.color}`);
});
db.close();
