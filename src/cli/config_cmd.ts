import { getDB } from '../db/db.js';
import { setConfig } from '../db/repo.js';

interface ConfigRow {
  key: string;
  value: string;
}

export function getConfigAll() {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM config').all() as ConfigRow[];
  const res: Record<string, string | number> = {};

  for (const row of rows) {
    const num = Number(row.value);
    res[row.key] = isNaN(num) ? row.value : num;
  }

  return res;
}

export function setConfigKV(key: string, value: string) {
  setConfig(key, value);
}
