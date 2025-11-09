import Database from 'better-sqlite3';
import path from 'node:path';
const dbPath = path.resolve(process.cwd(), 'queue.db');
const schema = `
-- jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,  -- ✅ priority column
  state TEXT NOT NULL DEFAULT 'pending', -- pending|processing|completed|failed|dead
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  run_at TEXT NOT NULL,  -- when eligible to run (for backoff/scheduling)
  last_error TEXT,
  stdout TEXT,
  stderr TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_state_runat ON jobs(state, run_at);

-- dlq table
CREATE TABLE IF NOT EXISTS dlq (
  id TEXT PRIMARY KEY,
  original_id TEXT NOT NULL,
  command TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  failed_at TEXT NOT NULL,
  last_error TEXT
);

-- config key/value (simple)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- defaults
INSERT OR IGNORE INTO config(key, value) VALUES
  ('backoff_base', '2'),
  ('job_timeout_sec', '60');
`;
const db = new Database(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(schema);
const columns = db.prepare(`PRAGMA table_info(jobs)`).all();
const hasPriority = columns.some((col) => col.name === 'priority');
if (!hasPriority) {
    db.prepare(`ALTER TABLE jobs ADD COLUMN priority INTEGER DEFAULT 0`).run();
    console.log('✅ Added "priority" column to jobs table');
}
console.log('Migration complete. DB at', dbPath);
