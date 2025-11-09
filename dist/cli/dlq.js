import { listDLQ } from '../db/repo.js';
export function printDLQ() {
    const rows = listDLQ();
    if (!rows.length) {
        console.log('DLQ empty.');
        return;
    }
    for (const r of rows) {
        console.log(`${r.id} | attempts=${r.attempts} | failed_at=${r.failed_at}`);
        if (r.last_error)
            console.log(`  last_error: ${r.last_error.slice(0, 120)}...`);
    }
}
