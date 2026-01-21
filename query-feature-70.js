const path = require('path');
const backendPath = path.join(__dirname, 'backend', 'node_modules', 'better-sqlite3');
const Database = require(backendPath);
const db = new Database(path.join(__dirname, 'features.db'));
const feature69 = db.prepare('SELECT * FROM features WHERE id = 69').get();
console.log('Feature 69 (dependency):');
console.log(JSON.stringify(feature69, null, 2));
db.close();
