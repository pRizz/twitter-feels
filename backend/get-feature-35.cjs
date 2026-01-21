const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/features.db');
const feature = db.prepare('SELECT id, name, description, steps, category FROM features WHERE id = 35').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
