const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'features.db');
const db = new Database(dbPath);
const feature = db.prepare('SELECT * FROM features WHERE id = 15').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
