const Database = require('better-sqlite3');
const db = new Database(__dirname + '/../features.db');
const f = db.prepare('SELECT * FROM features WHERE id = 68').get();
console.log(JSON.stringify(f, null, 2));
