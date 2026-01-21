const path = require('path');
const db = require(path.join(__dirname, 'backend', 'node_modules', 'better-sqlite3'))(path.join(__dirname, 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = 16').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
