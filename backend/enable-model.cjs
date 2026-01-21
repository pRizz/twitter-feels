// Re-enable model #12 (BERTweet Sentiment Analysis)
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data/twitter_feels.db'));

// Re-enable the model
const result = db.prepare('UPDATE llm_models SET is_enabled = 1 WHERE id = 12').run();
console.log('Re-enabled model #12:', result.changes, 'rows updated');

// Verify
const model = db.prepare('SELECT id, name, is_enabled FROM llm_models WHERE id = 12').get();
console.log('Model #12 status:', model);

db.close();
