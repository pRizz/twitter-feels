// Database connection singleton
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH = process.env.DATABASE_URL || join(DATA_DIR, 'twitter_feels.db');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Create singleton database instance
const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better concurrent access
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export default db;
