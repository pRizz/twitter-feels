const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'features.db');
const db = new Database(dbPath);
const feature = db.prepare('SELECT * FROM features WHERE id = 42').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
