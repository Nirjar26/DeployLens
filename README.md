# DeployLens

> A self-hosted CI/CD deployment visibility platform that unifies GitHub Actions and AWS CodeDeploy into a single real-time dashboard(still in the dev phase, its early access).

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-20%2B-green)
![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-blue)
![Status](https://img.shields.io/badge/status-active%20development-orange)

---

## The Problem

GitHub Actions runs your build. AWS CodeDeploy deploys your code. These two systems have no awareness of each other. To answer "did my deploy actually succeed end to end?" you have to manually check two separate tools, cross-reference a commit SHA, and piece the story together yourself.

**DeployLens fixes this.** It connects both systems, joins their data on commit SHA, and gives you one dashboard showing exactly what is live, what failed, and how long deploys are taking — in real time.

---

## Features

### Core Pipeline
- **Unified deployment view** — GitHub Actions + AWS CodeDeploy joined on commit SHA
- **SHA join aggregator** — runs every 2 minutes, merges partial records into unified deployments
- **Unified status** — `pending / running / success / failed / rolled_back` across both systems
- **Lifecycle events** — full CodeDeploy step breakdown (ApplicationStop → ValidateService)
- **One-click rollback** — triggers CodeDeploy to redeploy the previous successful revision

### Dashboard
- **Pipeline view** — paginated deployment table with filters (repo, environment, status, branch, date)
- **Environment swimlanes** — one column per environment showing what is currently live
- **Real-time updates** — WebSocket push via Socket.io, status badges update without page refresh
- **Active deployment banner** — live indicator when deployments are in progress
- **Failed deployment alert** — surfaces production failures from the last 24 hours
- **Status filter chips** — one-click filter by status with live counts
- **Deployment detail drawer/modal** — full metadata, GitHub steps, CodeDeploy lifecycle, rollback
- **Column sorting** — sort by time, duration, status
- **Row density toggle** — compact / default / comfortable
- **Export to CSV** — current filtered view exported client-side
- **Keyboard shortcuts** — `/` search, `R` sync, `?` help
- **Last good deploy** — always-visible indicator of most recent successful production deployment
- **Top deployers** — avatar strip showing most active team members (7 days)
- **Long-running warning** — surfaces deployments running 2× longer than average
- **Smart empty states** — context-aware messages based on what filters are active

### Analytics
- Deployment frequency chart (daily/weekly bars)
- Success rate trend over time
- Average duration trend with P95
- By repository breakdown
- By environment breakdown
- Mean time to recovery (MTTR)

### Configuration
- **Integrations** — GitHub OAuth + AWS credential management with health indicators
- **Repositories** — tracked repo management with webhook status, secrets, per-repo sync
- **Environments** — CodeDeploy group → friendly name mapping with color coding

### Account
- Profile management (name, timezone)
- Password change with session revocation
- Audit log — full history of every action taken in DeployLens

### Security
- AES-256-GCM encryption for all stored credentials
- Per-repo webhook secrets with HMAC-SHA256 verification
- SNS message signature verification
- JWT access + refresh token rotation (httpOnly cookies)
- All queries scoped to authenticated user — zero cross-user data leakage
- Socket.io connections authenticated with JWT

### Infrastructure
- Self-hostable via Docker + docker-compose
- Background pollers: GitHub every 30s, CodeDeploy every 60s, Aggregator every 2min
- Real-time push via GitHub webhooks and AWS SNS/EventBridge
- Polling fallback when webhooks are not configured

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20 + Express |
| Database | PostgreSQL 15 + Prisma ORM |
| Authentication | JWT (access + refresh), bcrypt, AES-256-GCM |
| AWS integration | AWS SDK v3 (CodeDeploy, STS) |
| Real-time | Socket.io |
| Frontend | React 19 + TypeScript |
| State management | Zustand |
| HTTP client | Axios with interceptors |
| Styling | CSS custom properties (design token system) |
| Validation | Zod |
| Jobs | node-cron |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- AWS account with CodeDeploy set up
- GitHub account with OAuth App credentials
- (Optional) AWS EventBridge + SNS for real-time push

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/deploylens.git
cd deploylens
```

### 2. Install dependencies

```bash
# Backend
cd apps/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Set up environment variables

```bash
cd apps/backend
cp .env.example .env
```

Fill in your `.env`:

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

### 4. Set up the database

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run the app

```bash
# Terminal 1 — Backend
cd apps/backend
npm run dev

# Terminal 2 — Frontend
cd apps/frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

**Demo credentials:**
- `alex@deploylens.dev` / `demo1234`
- `sam@deploylens.dev` / `demo1234`

---

## AWS Setup

### Required IAM Permissions

Create an IAM user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:ListApplications",
        "codedeploy:ListDeploymentGroups",
        "codedeploy:ListDeployments",
        "codedeploy:GetDeployment",
        "codedeploy:GetDeploymentGroup",
        "codedeploy:ListDeploymentInstances",
        "codedeploy:GetDeploymentInstance",
        "codedeploy:CreateDeployment",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

> Remove `codedeploy:CreateDeployment` if you do not need rollback functionality.

### GitHub Webhook Setup (per repo)

1. Start ngrok for local development: `ngrok http 3001`
2. Go to GitHub repo → Settings → Webhooks → Add webhook
3. Payload URL: `https://your-ngrok-url/api/webhooks/github`
4. Content type: `application/json`
5. Secret: copy the `webhook_secret` from your repo row in Prisma Studio
6. Events: select **Workflow runs** only

---

## Project Structure

```
deploylens/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── github/
│   │   │   │   ├── aws/
│   │   │   │   ├── deployments/
│   │   │   │   ├── environments/
│   │   │   │   ├── aggregator/
│   │   │   │   ├── analytics/
│   │   │   │   └── websocket/
│   │   │   ├── jobs/
│   │   │   │   ├── githubPoller.ts
│   │   │   │   ├── codedeployPoller.ts
│   │   │   │   └── aggregator.job.ts
│   │   │   └── utils/
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── frontend/
│       └── src/
│           ├── components/
│           │   ├── dashboard/
│           │   ├── layout/
│           │   └── shared/
│           ├── pages/
│           │   ├── settings/
│           │   └── onboarding/
│           ├── store/
│           ├── hooks/
│           └── lib/
```

---

## Roadmap

- [ ] Module 7 — Rollback (button wired to CodeDeploy SDK)
- [ ] Docker + docker-compose for one-command self-hosting
- [ ] Slack / email notifications on deployment failure
- [ ] Dark mode
- [ ] Mobile responsive layout
- [ ] Multi-user / team support
- [ ] Environment promotion (staging → production)
- [ ] Re-run failed GitHub Actions workflow
- [ ] Deployment comparison (diff two deployments)

---

## Known Limitations

- **GitHub Actions only** — GitLab CI, Jenkins, CircleCI not supported
- **CodeDeploy only** — EKS, Amplify, direct Lambda updates not tracked
- **Single user per account** — no team/org features yet
- **No email/Slack alerts** — you must watch the dashboard
- **No mobile layout** — optimized for desktop only
- **ngrok required for local webhook testing** — URL changes on every restart (free tier)

---

## Contributing

This project is actively being built. Contributions are welcome.

**Ways to contribute:**
- Feature implementation from the roadmap
- Bug fixes and issue reports
- UI/UX improvements
- Documentation
- Testing

**To get involved:** reach out on LinkedIn or open an issue. No formal contribution guidelines yet — just get in touch and we will figure it out.

---

## Security

Credentials stored in DeployLens are encrypted with AES-256-GCM before being written to the database. The encryption key never leaves your server. If you discover a security vulnerability, please reach out directly rather than opening a public issue.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

Built by **Nirjxr** — final-year BCA student at CHARUSAT, building in public.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-connect-blue)](https://linkedin.com/in/your-profile)
[![GitHub](https://img.shields.io/badge/GitHub-follow-black)](https://github.com/your-username)
