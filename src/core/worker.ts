import { execa } from 'execa';
import { claimJob, updateJob, moveToDLQ, getConfigNumber } from '../db/repo.js';
import { Job } from './types.js';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function workerLoop(workerId: number, stopSignal: { stop: boolean }) {
  const backoffBase = getConfigNumber('backoff_base', 2);
  const jobTimeoutSec = getConfigNumber('job_timeout_sec', 60);

  while (!stopSignal.stop) {
    const now = new Date().toISOString();
    const job = claimJob(now);
    if (!job) {
      await sleep(200); // idle wait
      continue;
    }
    await runJob(workerId, job, backoffBase, jobTimeoutSec);
  }
}

async function runJob(workerId: number, job: Job, backoffBase: number, timeoutSec: number) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), timeoutSec * 1000);

    // ✅ Run command properly in Windows CMD or Linux Bash
    const proc = await execa(job.command, {
      all: true,
      cancelSignal: ctrl.signal,
      shell: true,
      windowsHide: true,
    });

    clearTimeout(timeout);

    updateJob({
      id: job.id,
      state: 'completed',
      updated_at: new Date().toISOString(),
      stdout: truncate(proc.stdout || ''),
      stderr: truncate(proc.stderr || ''),
      last_error: null,
    });

    console.log(`[worker ${workerId}] job ${job.id} completed successfully in ${Date.now() - start}ms`);
    if (proc.stdout?.trim()) console.log(`[worker ${workerId}] output:\n${proc.stdout}`);
  } catch (err: any) {
    console.error(`[worker ${workerId}] ERROR OUTPUT:\n`, err.all || err.stderr || err.message);

    const attempts = job.attempts + 1;
    const delaySec = Math.pow(backoffBase, attempts);
    const nextRun = new Date(Date.now() + delaySec * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const errMsg = truncate(err?.all || err?.message || String(err));

    // ✅ Pull retry limit from config table
    const maxRetries = getConfigNumber('max_retries', job.max_retries || 1);

    if (attempts > maxRetries) {
      // Job exceeded retries → move to DLQ
      updateJob({
        id: job.id,
        state: 'dead',
        attempts,
        updated_at: nowIso,
        last_error: errMsg,
      });
      moveToDLQ({ ...job, attempts, last_error: errMsg }, nowIso);
      console.error(`[worker ${workerId}] job ${job.id} moved to DLQ after ${attempts} attempts`);
      return;
    }

    // ✅ Re-schedule for retry
    updateJob({
      id: job.id,
      state: 'pending',
      attempts,
      updated_at: nowIso,
      run_at: nextRun,
      last_error: errMsg,
    });

    console.warn(`[worker ${workerId}] job ${job.id} failed (attempt ${attempts}), retry at +${delaySec}s`);
  }
}

function truncate(s: string, max = 4000) {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n...[truncated ${s.length - max} chars]`;
}
