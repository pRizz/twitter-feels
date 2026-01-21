const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../features.db'));
const row = db.prepare('SELECT * FROM features WHERE id = 73').get();
console.log(JSON.stringify(row, null, 2));
