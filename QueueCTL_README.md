# 🚀 QueueCTL — Intelligent Background Job Queue System (with CLI + Web Dashboard)

QueueCTL is a **TypeScript-based background job management system** with real-time CLI controls and a modern web dashboard for monitoring and retrying failed jobs.

---

## 📋 Overview

QueueCTL lets you schedule, execute, and manage background jobs efficiently. It supports:
- Real-time job processing with retries and exponential backoff
- Dead Letter Queue (DLQ) for failed jobs
- Persistent storage (SQLite)
- Configurable retry/backoff parameters
- Interactive **Web Dashboard** for visualization and control

---

## ⚙️ Tech Stack

| Component | Technology |
|------------|-------------|
| **Language** | TypeScript (Node.js) |
| **Database** | SQLite (via Better-SQLite3) |
| **Runtime** | Node.js 22+ |
| **CLI** | Commander.js |
| **Web Server** | Express.js |
| **Frontend** | HTML + CSS (Custom Responsive UI) |

---

## 🧩 Features

- ✅ Job enqueue, processing, retry, and DLQ
- 🔁 Exponential backoff & configurable retry count
- 💾 Persistent queue (jobs survive restarts)
- ⚙️ Dynamic config via database
- 🌐 Express-based Web Dashboard for monitoring
- 🧠 Prevents race conditions with DB transactions
- 🧱 Modular TypeScript architecture

---

## 🧠 Architecture

### 🧭 Data Flow

```text
User → CLI → Queue DB → Worker(s) → DLQ (if fails) → Dashboard (monitor)
```

### 🧩 Core Modules

| File | Responsibility |
|------|----------------|
| `db/` | SQLite database management |
| `cli/` | Command-line interface logic |
| `core/` | Job processing & retry logic |
| `server.ts` | Express-based web dashboard |
| `dist/` | Compiled TypeScript output |

---

## 🧰 CLI Commands

| Command | Description | Example |
|----------|--------------|----------|
| `enqueue` | Add new job to queue | `node dist/cli/index.js enqueue job1 "echo Hello"` |
| `worker start --count <n>` | Start N workers | `node dist/cli/index.js worker start --count 2` |
| `status` | View job summary | `node dist/cli/index.js status` |
| `list --state <state>` | List jobs by state | `node dist/cli/index.js list --state failed` |
| `dlq list` | Show DLQ jobs | `node dist/cli/index.js dlq list` |
| `dlq retry <id>` | Retry a DLQ job | `node dist/cli/index.js dlq retry jobX` |
| `config get` | View config values | `node dist/cli/index.js config get` |
| `config set <key> <value>` | Update config | `node dist/cli/index.js config set max_retries 3` |

---

## 🌐 Web Dashboard Overview

> A modern, lightweight Express-based monitoring dashboard for QueueCTL — built to visualize background jobs, DLQ (Dead Letter Queue), and system metrics in real-time.

### ✨ **Key Features**
- 📊 **Real-time Job Insights** — Monitor pending, processing, completed, failed, and dead jobs.
- 🔁 **DLQ Management** — View and retry failed jobs instantly from the dashboard.
- 🕒 **Execution Timeline** — Track when jobs were created, updated, and retried.
- ⚙️ **Config Viewer** — Displays dynamic runtime configuration (e.g. retry count, timeout, backoff base).
- 🧩 **Modern UI** — Clean, mobile-friendly interface with responsive layout.

---

### 📸 **Dashboard Screenshots**

| View | Description |
|------|--------------|
| ![Dashboard Overview](./screenshots/dashboard_overview.png) | Shows overall system state, counts of jobs, and active workers. |
| ![DLQ Jobs](./screenshots/dlq_jobs.png) | List of failed jobs with error messages, retry buttons, and timestamps. |
| ![Job Details](./screenshots/job_details.png) | Detailed view for a single job including command, output, and retry history. |
| ![Configuration View](./screenshots/config_view.png) | Displays all configurable runtime parameters from the database. |

> 💡 *Place your actual screenshots inside a folder named `screenshots/` in your project root (same place as README.md).*

---

### 💻 **Access**

Once the server is running:
```
http://localhost:3000/
```

- `/` → Main Dashboard  
- `/dlq` → Dead Letter Queue Viewer  
- `/config` → Config Values Page

---

### 🧠 **Tech Stack**
- **Frontend:** HTML5 + CSS3 (custom responsive design)
- **Backend:** Express.js + Better-SQLite3
- **Runtime:** Node.js (TypeScript compiled to ES modules)
- **Database:** SQLite (Persistent local queue + config store)

---

## 🧾 Submission Checklist

- ✅ All required commands functional  
- ✅ Jobs persist after restart  
- ✅ Retry and backoff implemented correctly  
- ✅ DLQ operational  
- ✅ CLI user-friendly and documented  
- ✅ Code modular and maintainable  
- ✅ Web dashboard functional and styled  
- ✅ README and Architecture docs included  

---

## 🎥 Demo Video

🎬 **Google Drive Demo:** [Add Your Demo Link Here](https://drive.google.com/)

---

## 🏁 Final Notes

QueueCTL demonstrates a production-grade background job system built entirely with **vanilla TypeScript + Node.js** and **no frameworks**.  
It handles job scheduling, failure recovery, and real-time visualization — showing both backend robustness and frontend presentation.

---

© 2025 — Developed by Mahesh V
