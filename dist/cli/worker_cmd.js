import { workerLoop } from '../core/worker.js';
export async function startWorkers(count) {
    const stop = { stop: false };
    const workers = Array.from({ length: count }, (_, i) => workerLoop(i + 1, stop));
    const handle = () => {
        console.log('\nShutting down...');
        stop.stop = true;
    };
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
    await Promise.all(workers);
}
