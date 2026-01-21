const path = require('path');
const db = require(path.join(__dirname, 'backend', 'node_modules', 'better-sqlite3'))('./features.db');
const f = db.prepare('SELECT id, name, description, steps, passes, in_progress, category FROM features WHERE id = 17').get();
console.log(JSON.stringify(f, null, 2));
db.close();
