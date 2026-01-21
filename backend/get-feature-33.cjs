const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.resolve(__dirname, '..', 'features.db'));
const row = db.prepare('SELECT id, name, description, steps, category FROM features WHERE id = 33').get();
console.log(JSON.stringify(row, null, 2));
db.close();
