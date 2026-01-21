const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.resolve(__dirname, 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = 38').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
