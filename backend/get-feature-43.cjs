const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'features.db');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath);
const feature = db.prepare('SELECT * FROM features WHERE id = 43').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
