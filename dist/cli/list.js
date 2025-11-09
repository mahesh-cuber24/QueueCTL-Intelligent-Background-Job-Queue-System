import { listJobsByState } from '../db/repo.js';
export function printList(state) {
    const rows = listJobsByState(state);
    if (!rows.length) {
        console.log(`No jobs with state='${state}'.`);
        return;
    }
    for (const r of rows) {
        console.log(`${r.id} | ${r.state} | attempts=${r.attempts}/${r.max_retries} | run_at=${r.run_at}`);
        if (r.last_error)
            console.log(`  last_error: ${r.last_error.slice(0, 120)}...`);
    }
}
