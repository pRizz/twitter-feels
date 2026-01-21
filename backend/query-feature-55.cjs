const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = 55').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
