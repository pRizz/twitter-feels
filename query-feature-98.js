const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/features.db');
const feature = db.prepare('SELECT id, category, name, description, steps, passes, in_progress FROM features WHERE id = 98').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
