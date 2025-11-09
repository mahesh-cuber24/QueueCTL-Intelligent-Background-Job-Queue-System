import express, { Request, Response } from 'express';
import { listJobsByState, listDLQ, summary } from '../db/repo.js';
import { retryFromDLQ } from '../cli/retry.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function html(title: string, body: string) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        --bg: #0d0d10;
        --card: #1b1b1f;
        --text: #e8e8e8;
        --border: #2a2a2d;
        --accent: #007bff;
        --success: #4caf50;
        --fail: #f44336;
        --warn: #ff9800;
        --gray: #6c757d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Segoe UI', Roboto, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      header {
        background: #18181b;
        padding: 15px 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }
      header h1 { margin: 0; font-size: 1.5rem; color: var(--accent); }
      nav a {
        color: var(--text);
        text-decoration: none;
        margin-left: 20px;
        font-size: 0.95rem;
      }
      nav a:hover { color: var(--accent); }
      main { padding: 20px 30px; }
      h2 {
        margin-top: 40px;
        color: var(--accent);
        border-left: 4px solid var(--accent);
        padding-left: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--card);
        border-radius: 8px;
        overflow: hidden;
        margin-top: 10px;
        box-shadow: 0 0 5px #000;
      }
      th, td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        font-size: 0.9rem;
      }
      th { text-align: left; background: #202024; color: #ccc; }
      tr:hover { background: #2a2a2d; }
      button {
        background-color: var(--accent);
        color: white;
        border: none;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: 0.2s;
      }
      button:hover { background-color: #0056b3; transform: scale(1.05); }
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 5px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      .badge.pending { background: var(--warn); color: #000; }
      .badge.processing { background: var(--accent); }
      .badge.completed { background: var(--success); color: #000; }
      .badge.failed { background: var(--fail); }
      .badge.dead { background: var(--gray); }

      .stats-bar {
        display: flex;
        justify-content: space-around;
        background: var(--card);
        border: 1px solid var(--border);
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        box-shadow: 0 0 5px #000;
      }
      .stat {
        text-align: center;
        font-size: 0.95rem;
      }
      .stat span {
        display: block;
        font-size: 1.4rem;
        margin-top: 5px;
      }
      .stat.pending span { color: var(--warn); }
      .stat.processing span { color: var(--accent); }
      .stat.completed span { color: var(--success); }
      .stat.failed span { color: var(--fail); }
      .stat.dead span { color: var(--gray); }

      .toast {
        position: fixed;
        top: 15px;
        right: 15px;
        padding: 12px 18px;
        border-radius: 6px;
        font-size: 0.9rem;
        opacity: 0;
        transition: opacity 0.4s, transform 0.4s;
      }
      .toast.show { opacity: 1; transform: translateY(0); }
      .toast.success { background: rgba(76, 175, 80, 0.9); color: #fff; }
      .toast.error { background: rgba(244, 67, 54, 0.9); color: #fff; }

      footer {
        margin-top: 40px;
        text-align: center;
        padding: 10px;
        font-size: 0.8rem;
        color: #888;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Queue Dashboard</h1>
      <nav>
        <a href="/jobs">Jobs</a>
        <a href="/dlq">DLQ</a>
      </nav>
    </header>
    <main id="main-body">${body}</main>
    <div id="toast" class="toast"></div>
    <footer>QueueCTL © 2025 • Live Dashboard</footer>
    <script>
      function showToast(msg, type='success') {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = 'toast ' + type + ' show';
        setTimeout(() => t.className = 'toast ' + type, 2500);
      }
      async function retryJob(id) {
        try {
          const res = await fetch('/dlq/retry/' + id, { method: 'POST' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          showToast('✅ Job ' + id + ' requeued successfully');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          showToast('❌ Retry failed: ' + err, 'error');
        }
      }
    </script>
  </body>
  </html>`;
}

app.get('/', (_req: Request, res: Response) => res.redirect('/jobs'));

// ✅ Jobs page with stats
app.get('/jobs', (_req: Request, res: Response) => {
  const states = ['pending', 'processing', 'completed', 'failed', 'dead'];
  const stats = summary();
  const counts = stats.counts;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  let body = `
  <div class="stats-bar">
    ${states
      .map(
        (s) => `
      <div class="stat ${s}">
        ${s.toUpperCase()}
        <span>${counts[s] || 0}</span>
      </div>`
      )
      .join('')}
  </div>`;

  for (const s of states) {
    const rows = listJobsByState(s) as {
      id: string;
      command: string;
      attempts: number;
      max_retries: number;
      run_at: string;
      last_error?: string | null;
    }[];

    body += `<h2>${s.toUpperCase()} <span class="badge ${s}">${rows.length}</span></h2>`;
    if (rows.length === 0) {
      body += `<p><i>No jobs</i></p>`;
      continue;
    }

    body += `<table><tr><th>ID</th><th>Command</th><th>Attempts</th><th>Run At</th><th>Last Error</th></tr>`;
    for (const r of rows) {
      body += `<tr>
        <td>${r.id}</td>
        <td>${r.command}</td>
        <td>${r.attempts}/${r.max_retries}</td>
        <td>${r.run_at}</td>
        <td>${r.last_error ? `<span class='badge failed'>${r.last_error.slice(0, 60)}...</span>` : ''}</td>
      </tr>`;
    }
    body += `</table>`;
  }

  res.send(html('Queue Dashboard', body));
});

// ✅ DLQ Page with AJAX retry
app.get('/dlq', (_req: Request, res: Response) => {
  const rows = listDLQ() as {
    id: string;
    command: string;
    attempts: number;
    failed_at: string;
    last_error?: string | null;
  }[];

  let body = `<div class="stats-bar">
    <div class="stat dead">DLQ JOBS<span>${rows.length}</span></div>
  </div>`;

  if (rows.length === 0) {
    body += `<p><i>No failed jobs in DLQ</i></p>`;
  } else {
    body += `<table><tr><th>ID</th><th>Command</th><th>Attempts</th><th>Failed At</th><th>Error</th><th>Action</th></tr>`;
    for (const r of rows) {
      body += `<tr>
        <td>${r.id}</td>
        <td>${r.command}</td>
        <td>${r.attempts}</td>
        <td>${r.failed_at}</td>
        <td><span class='badge failed'>${r.last_error?.slice(0, 60) || ''}</span></td>
        <td><button onclick="retryJob('${r.id}')">Retry</button></td>
      </tr>`;
    }
    body += `</table>`;
  }

  res.send(html('Dead Letter Queue', body));
});

app.post('/dlq/retry/:id', (req: Request, res: Response) => {
  try {
    retryFromDLQ(req.params.id);
    res.status(200).send('OK');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Queue Dashboard running at http://localhost:${PORT}`);
});
