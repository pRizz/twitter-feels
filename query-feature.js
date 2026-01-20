const Database = require('/Users/peterryszkiewicz/Repos/twitter-feels/backend/node_modules/better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/features.db');
const feature = db.prepare('SELECT * FROM features WHERE id = 96').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
