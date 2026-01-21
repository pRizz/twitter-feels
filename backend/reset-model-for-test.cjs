// Reset a model to 'not_downloaded' status so we can test download progress
const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');

// Find all available huggingface models that don't have many analyses
const models = db.prepare(`
  SELECT m.id, m.name, m.huggingface_model_id, m.download_status,
         (SELECT COUNT(*) FROM sentiment_analyses WHERE llm_model_id = m.id) as analysis_count
  FROM llm_models m
  WHERE m.huggingface_model_id IS NOT NULL
`).all();
console.log('Models with analysis counts:');
models.forEach(m => console.log(`  ${m.id}: ${m.name} - ${m.download_status} - ${m.analysis_count} analyses`));

// Find a model with no analyses that we can reset
const modelToReset = models.find(m => m.analysis_count === 0);
if (modelToReset) {
  console.log(`\nResetting model: ${modelToReset.name} (ID: ${modelToReset.id})`);
  db.prepare("UPDATE llm_models SET download_status = 'not_downloaded', is_enabled = 0 WHERE id = ?").run(modelToReset.id);
  console.log('Model reset to not_downloaded status');
} else {
  console.log('\nNo model without analyses found. Looking for any huggingface model...');
  // Reset the first huggingface model that isn't heavily used
  const anyModel = models.find(m => m.huggingface_model_id && m.download_status === 'ready');
  if (anyModel) {
    console.log(`Resetting model: ${anyModel.name} (ID: ${anyModel.id})`);
    db.prepare("UPDATE llm_models SET download_status = 'not_downloaded', is_enabled = 0 WHERE id = ?").run(anyModel.id);
    console.log('Model reset to not_downloaded status');
  }
}

// Check the available models in the hardcoded list
console.log('\n\nAvailable models in the API:');
console.log('- meta-llama/Llama-3.2-3B-Instruct');
console.log('- cardiffnlp/twitter-roberta-base-sentiment-latest');
console.log('- j-hartmann/emotion-english-distilroberta-base');
console.log('- SamLowe/roberta-base-go_emotions');
console.log('- finiteautomata/bertweet-base-sentiment-analysis');

db.close();
