const path = require('path');
const Database = require(path.join(__dirname, 'backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.join(__dirname, 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(101);
console.log(JSON.stringify(feature, null, 2));
db.close();
