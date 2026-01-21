import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'features.db'));
const feature = db.prepare('SELECT * FROM features WHERE id = 228').get();
console.log(JSON.stringify(feature, null, 2));
db.close();
