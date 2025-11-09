import { summary } from '../db/repo.js';
import { blue, bold } from 'kleur/colors';
export function printStatus() {
    const s = summary();
    const states = ['pending', 'processing', 'completed', 'failed', 'dead'];
    console.log(bold(blue('Queue Status')));
    for (const st of states) {
        const c = s.counts[st] ?? 0;
        console.log(`  ${st.padEnd(10)} : ${c}`);
    }
    console.log(`  oldest pending: ${s.oldestPending || '—'}`);
}
