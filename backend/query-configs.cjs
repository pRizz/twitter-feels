const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'data', 'twitter_feels.db');
const db = new Database(dbPath);

// Get all configurations
const configs = db.prepare("SELECT key, value FROM configurations").all();
console.log('All configurations:');
configs.forEach(config => {
  console.log(`\n[${config.key}]:`);
  try {
    console.log(JSON.stringify(JSON.parse(config.value), null, 2));
  } catch (e) {
    console.log(config.value);
  }
});
