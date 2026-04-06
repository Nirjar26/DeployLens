<div align="center">
  <h1>DeployLens</h1>
  <p>CI/CD observability platform for unified deployment tracking across GitHub Actions and AWS CodeDeploy.</p>
</div>

## Problem Statement

GitHub Actions and AWS CodeDeploy expose related deployment data in separate systems. Teams often have to manually map workflow runs to deployment executions and infer whether a specific commit reached production. DeployLens solves this by correlating both sources into one deployment timeline.

## Features

- **Correlation:** Joins GitHub workflow runs and CodeDeploy deployments by commit SHA.
- **Unified status:** Tracks `pending`, `running`, `success`, `failed`, and `rolled_back`.
- **Realtime updates:** Streams deployment changes to the dashboard through Socket.io.
- **Dashboard filters:** Supports repository, environment, status, branch, and date filters.
- **Deployment detail:** Captures lifecycle events, durations, and rollback history.
- **Security controls:** Uses JWT auth, CSRF protection, webhook signature validation, and encrypted credential storage.

## Architecture / Flow

<p align="center">
  <img src="./diagram/Architecture.png" alt="Architecture" width="420" />
</p>


## Tech Stack

- **Frontend:** React, TypeScript, Vite, Zustand
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma
- **DevOps/Integrations:** GitHub Actions, AWS CodeDeploy, AWS SDK v3
- **Realtime and Security:** Socket.io, JWT, CSRF, AES-256-GCM

## How It Works

- **Step 1:** A commit triggers a GitHub Actions workflow.
- **Step 2:** GitHub and AWS events are ingested through webhooks and pollers.
- **Step 3:** Raw records are stored in PostgreSQL.
- **Step 4:** The aggregator links records by commit SHA.
- **Step 5:** DeployLens computes unified status and emits live updates to clients.

## Installation / Setup

```bash
git clone https://github.com/Nirjar26/deploylens.git
cd deploylens

cd backend
npm install

cd ../frontend
npm install

# run backend and frontend in separate terminals
cd ../backend
npm run dev

cd ../frontend
npm run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/deploylens

JWT_SECRET=<64 hex chars>
JWT_REFRESH_SECRET=<64 hex chars>
ENCRYPTION_KEY=<64 hex chars>
PORT=3001

FRONTEND_URL=http://localhost:5173

GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
GITHUB_WEBHOOK_SECRET=<random-string>
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/github/callback

AWS_ACCESS_KEY_ID=<aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<aws-secret-access-key>
AWS_REGION=<aws-region>
```

## API Endpoints

| Method | Endpoint |
|---|---|
| POST | /api/auth/login |
| POST | /api/auth/register |
| POST | /api/auth/refresh |
| GET | /api/deployments |
| GET | /api/deployments/:id |
| POST | /api/deployments/:id/rollback |
| GET | /api/analytics |
| POST | /api/webhooks/github |
| POST | /api/webhooks/aws |

## Folder Structure

- deploylens
  - README.md
  - diagram
    - Architecture.png
  - backend
    - package.json
    - tsconfig.json
    - prisma
      - schema.prisma
      - migrations
      - seed.ts
    - src
      - app.ts
      - server.ts
      - jobs
      - middleware
      - modules
        - auth
        - account
        - github
        - aws
        - deployments
        - environments
        - aggregator
        - analytics
        - audit
        - webhooks
        - websocket
      - utils
  - frontend
    - package.json
    - index.html
    - vite.config.ts
    - src
      - App.tsx
      - main.tsx
      - components
      - pages
      - hooks
      - lib
      - store
      - styles
      - assets
      - types

## License

MIT License

## Author / Contact

Nirjar Goswami  
GitHub: https://github.com/Nirjar26

