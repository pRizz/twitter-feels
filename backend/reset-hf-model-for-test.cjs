// Reset a huggingface model to 'not_downloaded' status so we can test download progress
const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');

// First revert the previous reset
db.prepare("UPDATE llm_models SET download_status = 'ready', is_enabled = 1 WHERE id = 1").run();

// Find all huggingface models with their IDs
const models = db.prepare(`
  SELECT m.id, m.name, m.huggingface_model_id, m.download_status
  FROM llm_models m
  WHERE m.huggingface_model_id IS NOT NULL
`).all();
console.log('HuggingFace models:');
models.forEach(m => console.log(`  ${m.id}: ${m.name} - HF: ${m.huggingface_model_id} - Status: ${m.download_status}`));

// Reset the BERTweet model (ID 12) - it has one of the available models in the API
const modelToReset = 12;
console.log(`\nResetting model ID ${modelToReset}...`);
db.prepare("UPDATE llm_models SET download_status = 'not_downloaded', is_enabled = 0 WHERE id = ?").run(modelToReset);
console.log('Done - BERTweet model reset to not_downloaded status');

// Verify
const updated = db.prepare("SELECT id, name, download_status FROM llm_models WHERE id = ?").get(modelToReset);
console.log('Updated model:', updated);

db.close();
