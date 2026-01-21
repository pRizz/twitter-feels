const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database(__dirname + '/features.db');
const feature = db.prepare('SELECT * FROM features WHERE id = 30').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
