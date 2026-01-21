const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'features.db');
const db = new Database(dbPath);
const f = db.prepare('SELECT * FROM features WHERE id = 225').get();
console.log(JSON.stringify(f, null, 2));
