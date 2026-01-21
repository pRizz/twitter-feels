const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./backend/data/twitter_feels.db');

// Reset admin password to 'admin' for testing
db.prepare("UPDATE admin_users SET password_hash = 'hashed_admin' WHERE username = 'admin'").run();
console.log('Admin password reset to: admin');

// Check admin_users
const admins = db.prepare('SELECT * FROM admin_users').all();
console.log('\nAdmin users:');
console.log(JSON.stringify(admins, null, 2));

db.close();
