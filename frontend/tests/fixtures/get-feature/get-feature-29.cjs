const path = require('path');
const repoRoot = path.resolve(__dirname, '../../../..');
const Database = require(path.resolve(repoRoot, 'backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.resolve(repoRoot, 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(29);
console.log(JSON.stringify(feature, null, 2));
db.close();
