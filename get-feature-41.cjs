const path = require('path');
const Database = require(path.resolve(__dirname, 'backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.resolve(__dirname, 'features.db'));
const row = db.prepare('SELECT id, name, description, steps, passes, in_progress FROM features WHERE id = 41').get();
console.log(JSON.stringify(row, null, 2));
