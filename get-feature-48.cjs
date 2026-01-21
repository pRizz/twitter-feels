const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'features.db'));
const f = db.prepare('SELECT id, name, category, description, steps FROM features WHERE id = 48').get();
console.log(JSON.stringify(f, null, 2));
