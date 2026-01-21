const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/twitter_feels.db');

// Check configurations table for gauge_config
const config = db.prepare("SELECT * FROM configurations WHERE key = 'gauge_config'").get();
console.log('Gauge config from configurations table:');
if (config) {
  console.log(JSON.stringify(JSON.parse(config.value), null, 2));
} else {
  console.log('No gauge_config found in configurations table');
}

db.close();
