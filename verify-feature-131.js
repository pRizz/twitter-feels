// Verify Feature #131: Disabling model preserves data
import Database from 'better-sqlite3';

const DB_PATH = './backend/data/twitter_feels.db';
const db = new Database(DB_PATH);

// Get all models and their analysis counts
const models = db.prepare(`
  SELECT
    m.id,
    m.name,
    m.is_enabled,
    COUNT(sa.id) as analysis_count
  FROM llm_models m
  LEFT JOIN sentiment_analyses sa ON sa.llm_model_id = m.id
  GROUP BY m.id
  ORDER BY m.id
`).all();

console.log('=== LLM Models and Analysis Counts ===');
console.log('ID | Enabled | Analysis Count | Name');
console.log('-'.repeat(60));
models.forEach(m => {
  console.log(`${m.id.toString().padEnd(3)}| ${m.is_enabled ? 'Yes' : 'No '}     | ${m.analysis_count.toString().padStart(14)} | ${m.name}`);
});

// Find a model with analyses
const modelWithAnalyses = models.find(m => m.analysis_count > 0);
if (modelWithAnalyses) {
  console.log(`\nModel #${modelWithAnalyses.id} (${modelWithAnalyses.name}) has ${modelWithAnalyses.analysis_count} analyses`);
} else {
  console.log('\nNo models have analyses yet');
}

db.close();
