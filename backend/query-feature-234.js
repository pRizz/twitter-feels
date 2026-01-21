const Database = require('better-sqlite3');
const db = new Database('../features.db');
const f = db.prepare('SELECT id, name, description, steps, passes, in_progress, category FROM features WHERE id = 234').get();
console.log(JSON.stringify(f, null, 2));
db.close();
