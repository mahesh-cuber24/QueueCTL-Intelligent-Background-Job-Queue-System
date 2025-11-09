export type JobState = 'pending'|'processing'|'completed'|'failed'|'dead';

export interface Job {
  id: string;
  command: string;
  priority: number; // ✅ new field added
  state: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
  attempts: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  run_at: string;
  last_error: string | null;
  stdout: string | null;
  stderr: string | null;
}

export interface Config {
  backoff_base: number;       // e.g. 2
  job_timeout_sec: number;    // e.g. 60
}
