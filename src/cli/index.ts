#!/usr/bin/env node
import { Command } from 'commander';
import { enqueue } from './enqueue.js';
import { startWorkers } from './worker_cmd.js';
import { printStatus } from './status.js';
import { printList } from './list.js';
import { printDLQ } from './dlq.js';
import { retryFromDLQ } from './retry.js';
import { getConfigAll, setConfigKV } from './config_cmd.js';

// Avoid re-registering commands if reloaded
if ((global as any).__queuectl_loaded) process.exit(0);
(global as any).__queuectl_loaded = true;

const program = new Command();

program
  .name('queuectl')
  .description('CLI-based background job queue with retries, backoff, DLQ, and priority support')
  .version('0.2.0');

// ✅ Enqueue command (supports JSON or args)
program
  .command('enqueue')
  .argument('<input>', 'Job JSON or ID')
  .argument('[command]', 'Command to execute (if not using JSON)')
  .option('--priority <n>', 'priority level (default 0)', '0')
  .action((input, command, opts) => {
    // Try to detect and clean up JSON-style input
    const trimmed = input.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        enqueue(parsed);
        console.log('✅ Enqueued job from JSON.');
      } catch (err) {
        console.error('❌ Invalid JSON input. Make sure to use double quotes properly.');
        console.error('Example:');
        console.error(`  node dist/cli/index.js enqueue "{\\"id\\":\\"job1\\",\\"command\\":\\"echo hi\\"}"`);
      }
    } else {
      enqueue({ id: input, command, priority: Number(opts.priority) });
      console.log(`✅ Enqueued job ${input} (${command}) with priority ${opts.priority}`);
    }
  });

// ✅ Worker command
program
  .command('worker')
  .command('start')
  .option('--count <n>', 'number of workers', '1')
  .action(async (opts) => {
    const n = Number(opts.count) || 1;
    await startWorkers(n);
  });

// ✅ Status command
program
  .command('status')
  .action(() => printStatus());

// ✅ List command
program
  .command('list')
  .option('--state <state>', 'pending|processing|completed|failed|dead', 'pending')
  .action((opts) => printList(opts.state));

// ✅ DLQ list & retry
const dlq = program.command('dlq');
dlq.command('list').action(() => printDLQ());
dlq.command('retry')
  .argument('<id>')
  .action((id) => retryFromDLQ(id));

// ✅ Config get/set
const config = program.command('config');
config.command('get').action(() => {
  const c = getConfigAll();
  console.log(c);
});
config.command('set')
  .argument('<key>')
  .argument('<value>')
  .action((key, value) => {
    setConfigKV(key, value);
    console.log('OK');
  });

program.parseAsync(process.argv);
