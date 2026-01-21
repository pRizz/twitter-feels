const path = require('path');
const Database = require(path.resolve(__dirname, 'backend', 'node_modules', 'better-sqlite3'));
const db = new Database(path.resolve(__dirname, 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = 13').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
