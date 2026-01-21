const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'features.db'));
const f = db.prepare('SELECT * FROM features WHERE id = 87').get();
console.log(JSON.stringify(f, null, 2));
