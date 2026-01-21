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
const db: Database.Database = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better concurrent access
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Run migrations
function runMigrations() {
  // Migration: Add download_progress column to llm_models
  const columns = db
    .prepare("PRAGMA table_info(llm_models)")
    .all() as Array<{ name: string }>;
  const hasDownloadProgress = columns.some((col) => col.name === 'download_progress');
  if (!hasDownloadProgress) {
    db.prepare("ALTER TABLE llm_models ADD COLUMN download_progress INTEGER DEFAULT 0").run();
    console.log('Migration: Added download_progress column to llm_models');
  }
}

runMigrations();

export default db;
