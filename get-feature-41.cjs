const Database = require('/Users/peterryszkiewicz/Repos/twitter-feels/backend/node_modules/better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/features.db');
const row = db.prepare('SELECT id, name, description, steps, passes, in_progress FROM features WHERE id = 41').get();
console.log(JSON.stringify(row, null, 2));
