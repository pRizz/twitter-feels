const path = require('path');
const repoRoot = path.resolve(__dirname, '../../../..');
const Database = require(path.resolve(repoRoot, 'backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.resolve(repoRoot, 'features.db'));
const row = db
  .prepare('SELECT id, name, description, steps, category, passes, in_progress FROM features WHERE id = 79')
  .get();
console.log(JSON.stringify(row, null, 2));
db.close();
