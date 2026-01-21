const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, '..', 'features.db');
const db = new Database(dbPath);
const featureId = process.argv[2] || 59;
const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(featureId);
console.log(JSON.stringify(feature, null, 2));
db.close();
