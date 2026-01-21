import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = 90').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
