const Database = require('better-sqlite3');
const db = new Database('/Users/peterryszkiewicz/Repos/twitter-feels/backend/data/twitter_feels.db');

// Get current gauge config
const config = db.prepare("SELECT value FROM configurations WHERE key = 'gauges'").get();
if (!config) {
  console.error('No gauges configuration found');
  process.exit(1);
}

const gauges = JSON.parse(config.value);
console.log('Current gauges config:');
console.log(JSON.stringify(gauges, null, 2));

// Find and fix the Anger Gauge
const angerGauge = gauges.find(g => g.name === 'Anger Gauge');
if (angerGauge) {
  console.log('\nCurrent Anger Gauge lowLabel:', angerGauge.lowLabel);

  if (angerGauge.lowLabel !== 'Chill') {
    angerGauge.lowLabel = 'Chill';

    // Update the database
    const updatedConfig = JSON.stringify(gauges);
    db.prepare("UPDATE configurations SET value = ?, updated_at = datetime('now') WHERE key = 'gauges'").run(updatedConfig);

    console.log('Fixed! Updated Anger Gauge lowLabel to: Chill');

    // Verify the update
    const verifyConfig = db.prepare("SELECT value FROM configurations WHERE key = 'gauges'").get();
    const verifiedGauges = JSON.parse(verifyConfig.value);
    const verifiedAngerGauge = verifiedGauges.find(g => g.name === 'Anger Gauge');
    console.log('Verified Anger Gauge lowLabel:', verifiedAngerGauge.lowLabel);
  } else {
    console.log('Anger Gauge lowLabel is already "Chill" - no change needed');
  }
} else {
  console.error('Anger Gauge not found in configuration');
}

db.close();
