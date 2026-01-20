const Database = require('./backend/node_modules/better-sqlite3');
const db = new Database('./features.db');

const featureId = process.argv[2] || 139;
const row = db.prepare('SELECT * FROM features WHERE id = ?').get(featureId);

if (row) {
  console.log('Feature #' + row.id);
  console.log('Name:', row.name);
  console.log('Category:', row.category);
  console.log('Description:', row.description);
  console.log('Steps:', row.steps);
  console.log('Passes:', row.passes);
  console.log('In Progress:', row.in_progress);
} else {
  console.log('Feature not found');
}

db.close();
