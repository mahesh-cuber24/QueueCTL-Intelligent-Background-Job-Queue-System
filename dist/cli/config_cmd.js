import { getDB } from '../db/db.js';
import { setConfig } from '../db/repo.js';
export function getConfigAll() {
    const db = getDB();
    const rows = db.prepare('SELECT key, value FROM config').all();
    const res = {};
    for (const row of rows) {
        const num = Number(row.value);
        res[row.key] = isNaN(num) ? row.value : num;
    }
    return res;
}
export function setConfigKV(key, value) {
    setConfig(key, value);
}
