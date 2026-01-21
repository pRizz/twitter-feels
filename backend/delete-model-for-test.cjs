// Delete the BERTweet model so we can test download progress
const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');

// Find the BERTweet model
const model = db.prepare("SELECT id, name FROM llm_models WHERE huggingface_model_id = 'finiteautomata/bertweet-base-sentiment-analysis'").get();
console.log('Found model:', model);

if (model) {
  // Delete it
  db.prepare('DELETE FROM llm_models WHERE id = ?').run(model.id);
  console.log('Deleted model:', model.name);
} else {
  console.log('Model not found');
}

// List remaining models
const models = db.prepare('SELECT id, name, huggingface_model_id, download_status FROM llm_models').all();
console.log('Remaining models:', models);

db.close();
