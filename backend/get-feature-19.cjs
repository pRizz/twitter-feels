const db = require('better-sqlite3')('/Users/peterryszkiewicz/Repos/twitter-feels/features.db');
const feature = db.prepare('SELECT id, name, description, steps FROM features WHERE id = 19').get();
console.log(JSON.stringify(feature, null, 2));
