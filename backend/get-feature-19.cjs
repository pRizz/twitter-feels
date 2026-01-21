const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.resolve(__dirname, '..', 'features.db'));
const feature = db.prepare('SELECT id, name, description, steps FROM features WHERE id = 19').get();
console.log(JSON.stringify(feature, null, 2));
