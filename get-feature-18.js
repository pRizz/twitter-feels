const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'features.db');
const db = new Database(dbPath);
const row = db.prepare('SELECT * FROM features WHERE id = 18').get();
console.log(JSON.stringify(row, null, 2));
db.close();
