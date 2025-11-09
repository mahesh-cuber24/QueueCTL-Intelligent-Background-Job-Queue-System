import Database from 'better-sqlite3';
import path from 'node:path';

let _db: Database.Database | null = null;

export function getDB() {
  if (_db) return _db;
  const dbPath = path.resolve(process.cwd(), 'queue.db');
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  return _db;
}
