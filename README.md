<div align="center">
  <h1>DeployLens</h1>
  <p>Track GitHub Actions and AWS CodeDeploy as a single deployment timeline joined by commit SHA.</p>
</div>

## Problem

GitHub Actions and AWS CodeDeploy expose deployment data in separate systems. Without correlation, teams must manually compare workflow runs and deployment events to confirm whether a commit reached a target environment successfully.

## Architecture

```text
Developer push
   |
   v
GitHub Actions --------------------+
   |                               |
   | webhook / poll                | webhook / poll
   v                               v
DeployLens Ingestion (API + jobs)
   |
   v
PostgreSQL (GitHub + CodeDeploy records)
   |
   v
Aggregator (every 2 min, join on commit SHA)
   |
   v
Unified status (pending/running/success/failed/rolled_back)
   |
   v
Socket.io
   |
   v
Dashboard updates
```

## Features

DeployLens focuses on one job: show deployment state from GitHub Actions and AWS CodeDeploy as one timeline.

- Correlation pipeline: Ingests GitHub and CodeDeploy events through webhooks and pollers, stores both streams in PostgreSQL, and joins records by commit SHA.
- Unified status model: Tracks `pending`, `running`, `success`, `failed`, and `rolled_back` states across systems.
- Dashboard workflow: Supports filtering by repository, environment, status, branch, and date, with detailed deployment views for metadata, lifecycle events, duration, and rollback context.
- Realtime updates: Pushes deployment changes over Socket.io so dashboard state updates without reloads.
- Scheduled jobs: Runs GitHub polling every 30 seconds, CodeDeploy polling every 60 seconds, and aggregation every 2 minutes.
- Security controls: Uses JWT access and refresh tokens, CSRF protection, AES-256-GCM credential encryption, webhook signature verification, and per-user data isolation.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL 15, Prisma ORM |
| Frontend | React 19, TypeScript, Vite |
| Real-time | Socket.io |
| State | Zustand |
| HTTP | Axios |
| Validation | Zod |
| Jobs | node-cron |
| Cloud SDK | AWS SDK v3 (CodeDeploy, STS) |
| Auth and Security | JWT, bcrypt, CSRF, AES-256-GCM |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- GitHub OAuth credentials
- AWS credentials with CodeDeploy access

### Install

```bash
git clone https://github.com/Nirjar26/deploylens.git
cd deploylens

cd backend
npm install

cd ../frontend
npm install
```

### Configure backend environment

Create `backend/.env` with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/deploylens
JWT_SECRET=<64 hex chars>
JWT_REFRESH_SECRET=<different 64 hex chars>
ENCRYPTION_KEY=<64 hex chars>
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
GITHUB_WEBHOOK_SECRET=<random 20+ char string>
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/github/callback
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### Run

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

### Webhooks (local)

- GitHub: `POST /api/webhooks/github` with `application/json`
- AWS SNS/EventBridge: `POST /api/webhooks/aws` with `text/plain`
- Use `ngrok http 3001` if you need a public callback URL locally

## Project Structure

```text
deploylens/
|-- backend/
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   `-- src/
|       |-- app.ts
|       |-- server.ts
|       |-- jobs/
|       |   |-- githubPoller.ts
|       |   `-- codedeployPoller.ts
|       |-- middleware/
|       |-- modules/
|       |   |-- auth/
|       |   |-- account/
|       |   |-- github/
|       |   |-- aws/
|       |   |-- deployments/
|       |   |-- environments/
|       |   |-- aggregator/
|       |   |-- analytics/
|       |   |-- audit/
|       |   |-- webhooks/
|       |   `-- websocket/
|       `-- utils/
`-- frontend/
    `-- src/
        |-- components/
        |-- pages/
        |-- hooks/
        |-- store/
        |-- lib/
        `-- styles/
```

## API Reference

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Service health check |
| POST | /api/auth/register | Register account |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout current session |
| GET | /api/account | Get account profile |
| PUT | /api/account | Update account profile |
| GET | /api/github/connection | Get GitHub connection status |
| GET | /api/github/repos | List GitHub repositories |
| POST | /api/github/repos/track | Track repositories |
| GET | /api/github/repos/tracked | List tracked repositories |
| POST | /api/github/repos/:repoId/sync | Sync repository data |
| DELETE | /api/github/repos/:repoId/untrack | Untrack repository |
| GET | /api/settings/aws | Get AWS connection status |
| POST | /api/settings/aws | Save AWS credentials |
| DELETE | /api/settings/aws | Remove AWS credentials |
| GET | /api/aws/applications | List CodeDeploy applications |
| GET | /api/aws/deployment-groups | List deployment groups |
| GET | /api/deployments | List unified deployments |
| GET | /api/deployments/:id | Get deployment details |
| POST | /api/deployments/:id/rollback | Trigger rollback |
| GET | /api/analytics | Analytics summary and trends |
| GET | /api/audit | Audit log entries |
| POST | /api/webhooks/github | GitHub webhook receiver |
| POST | /api/webhooks/aws | AWS webhook receiver |

### Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | BAD_REQUEST | Invalid request payload or query |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | INVALID_CSRF_TOKEN | Missing or invalid CSRF token |
| 403 | FORBIDDEN | Authenticated but not allowed |
| 404 | NOT_FOUND | Resource does not exist |
| 409 | CONFLICT | Duplicate or conflicting state |
| 429 | RATE_LIMITED | Request or upstream rate limit exceeded |
| 500 | INTERNAL_ERROR | Unhandled server error |

## License

MIT. See [LICENSE](LICENSE) for details.

