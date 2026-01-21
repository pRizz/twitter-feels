const path = require('path');
const Database = require(path.join(__dirname, 'backend/node_modules/better-sqlite3'));
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/features.db');
const feature = db.prepare('SELECT id, category, name, description, steps, passes, in_progress FROM features WHERE id = 20').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
