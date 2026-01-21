const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data/twitter_feels.db'));

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
  console.log(m.id.toString().padEnd(3) + '| ' + (m.is_enabled ? 'Yes' : 'No ') + '     | ' + m.analysis_count.toString().padStart(14) + ' | ' + m.name);
});

db.close();
