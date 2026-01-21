const sqlite = require('better-sqlite3');
const db = new sqlite('./features.db');
const feature = db.prepare('SELECT * FROM features WHERE id = 45').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
