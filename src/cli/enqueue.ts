import { upsertJob } from '../db/repo.js';
import { Job } from '../core/types.js';

/**
 * Enqueue a new job.
 * Supports both JSON string and direct object input.
 */
export function enqueue(
  input: string | { id: string; command: string; priority?: number; max_retries?: number; run_at?: string }
) {
  let payload: Partial<Job>;

  // If user passes JSON string (old style)
  if (typeof input === 'string') {
    try {
      payload = JSON.parse(input);
    } catch {
      throw new Error('Invalid JSON for job payload.');
    }
  } else {
    // If user passes an object (new CLI style)
    payload = input;
  }

  if (!payload.id || !payload.command) {
    throw new Error('Job must include id and command.');
  }

  const now = new Date().toISOString();
  const job: Job = {
    id: String(payload.id),
    command: String(payload.command),
    priority: payload.priority ?? 0, // ✅ new field
    state: 'pending',
    attempts: 0,
    max_retries: payload.max_retries ?? 3,
    created_at: now,
    updated_at: now,
    run_at: payload.run_at ?? now,
    last_error: null,
    stdout: null,
    stderr: null
  };

  upsertJob(job);
}
