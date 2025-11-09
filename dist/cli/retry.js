import { getJob, upsertJob } from '../db/repo.js';
export function retryFromDLQ(id) {
    const j = getJob(id);
    if (!j || j.state !== 'dead') {
        throw new Error('Job not found in DLQ (state!=dead).');
    }
    const now = new Date().toISOString();
    const reset = {
        ...j,
        state: 'pending',
        attempts: 0,
        updated_at: now,
        run_at: now,
        last_error: null
    };
    upsertJob(reset);
    console.log('Re-enqueued job', id);
}
