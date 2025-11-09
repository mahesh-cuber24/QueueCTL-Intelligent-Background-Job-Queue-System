import { getDB } from './db.js';
import { Job } from '../core/types.js';

const db = getDB();

/**
 * Insert a new job into the jobs table
 */
export function insertJob(job: Job) {
  const stmt = db.prepare(`
    INSERT INTO jobs(
      id, command, state, attempts, max_retries,
      created_at, updated_at, run_at,
      last_error, stdout, stderr, priority
    ) VALUES (
      @id, @command, @state, @attempts, @max_retries,
      @created_at, @updated_at, @run_at,
      @last_error, @stdout, @stderr, @priority
    )
  `);
  stmt.run(job as any);
}


/**
 * Retrieve a config value as a number
 */
export function getConfigNumber(key: string, def: number) {
  const row = db
    .prepare('SELECT value FROM config WHERE key=?')
    .get(key) as { value?: string } | undefined;
  if (!row?.value) return def;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : def;
}

/**
 * Set or update a config key/value pair
 */
export function setConfig(key: string, value: string) {
  db.prepare(`
    INSERT INTO config(key, value)
    VALUES (?, ?)
    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
  `).run(key, value);
}

/**
 * Claim a pending job for processing.
 * Only picks jobs whose run_at <= current time (with timestamp comparison)
 */
export function claimJob(nowIso: string): Job | null {
  const tx = db.transaction((now: string) => {
    // ✅ Compare timestamps numerically instead of ISO strings
    const row = db
      .prepare(`
        SELECT id FROM jobs
        WHERE state='pending'
          AND strftime('%s', run_at) <= strftime('%s', ?)
        ORDER BY priority DESC, created_at ASC

        LIMIT 1
      `)
      .get(now) as { id?: string } | undefined;

    if (!row?.id) return null;

    const upd = db.prepare(`
      UPDATE jobs
      SET state='processing', updated_at=?
      WHERE id=? AND state='pending'
    `);
    const res = upd.run(now, row.id);
    if (res.changes === 0) return null;

    const job = db.prepare('SELECT * FROM jobs WHERE id=?').get(row.id) as Job;
    return job;
  });
  return tx(nowIso);
}

/**
 * Update an existing job record by ID
 */
export function updateJob(job: Partial<Job> & { id: string }) {
  const fields = [
    'command',
    'state',
    'attempts',
    'max_retries',
    'created_at',
    'updated_at',
    'run_at',
    'last_error',
    'stdout',
    'stderr',
  ];
  const sets: string[] = [];
  const params: any[] = [];

  for (const f of fields) {
    if (job[f as keyof Job] !== undefined) {
      sets.push(`${f}=?`);
      params.push((job as any)[f]);
    }
  }

  params.push(job.id);
  const sql = 'UPDATE jobs SET ' + sets.join(', ') + ' WHERE id=?';
  db.prepare(sql).run(...params);
}

/**
 * Move a failed job to the DLQ (Dead Letter Queue)
 */
export function moveToDLQ(job: Job, failedAtIso: string) {
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT OR REPLACE INTO dlq(
        id, original_id, command, attempts, failed_at, last_error
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.id,
      job.command,
      job.attempts,
      failedAtIso,
      job.last_error || null
    );

    db.prepare(`
      UPDATE jobs SET state='dead', updated_at=? WHERE id=?
    `).run(failedAtIso, job.id);
  });
  tx();
}

/**
 * List all jobs filtered by state
 */
export function listJobsByState(state: string) {
  return db.prepare('SELECT * FROM jobs WHERE state=? ORDER BY created_at').all(state);
}

/**
 * List all jobs in the DLQ
 */
export function listDLQ() {
  return db.prepare('SELECT * FROM dlq ORDER BY failed_at DESC').all();
}

/**
 * Retrieve a job by ID
 */
export function getJob(id: string) {
  return db.prepare('SELECT * FROM jobs WHERE id=?').get(id) as Job | undefined;
}

/**
 * Insert or update a job (upsert)
 */
export function upsertJob(job: Job) {
  const exists = getJob(job.id);
  if (exists) return updateJob(job);
  return insertJob(job);
}

/**
 * Summary of all job states
 */
export function summary() {
  const counts = db.prepare(`
    SELECT state, COUNT(*) as c FROM jobs GROUP BY state
  `).all();

  const res: Record<string, number> = {};
  for (const row of counts as { state: string; c: number }[]) {
    res[row.state] = row.c;
  }

  const pendingOldest = db
    .prepare("SELECT MIN(created_at) as m FROM jobs WHERE state='pending'")
    .get() as { m?: string };

  return { counts: res, oldestPending: pendingOldest.m || null };
}
