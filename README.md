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

```text
deploylens/
  README.md
  diagram/
    Architecture.png
  backend/
    backend-log.txt
    package.json
    tsconfig.json
    prisma/
      schema.prisma
      seed.js
      seed.ts
      migrations/
        migration_lock.toml
        20260323040757_init/
          migration.sql
        20260323104220_add_audit_log/
          migration.sql
        20260328113000_add_refresh_token_updated_at/
          migration.sql
    src/
      app.ts
      server.ts
      jobs/
        codedeployPoller.ts
        githubPoller.ts
      middleware/
        csrfProtection.ts
        errorHandler.ts
        rateLimit.ts
        requestLogger.ts
        verifyToken.ts
      modules/
        account/
          account.controller.ts
          account.routes.ts
          account.service.ts
        aggregator/
          aggregator.job.ts
          aggregator.routes.ts
          aggregator.service.ts
          aggregator.types.ts
        analytics/
          analytics.controller.ts
          analytics.routes.ts
          analytics.service.ts
        audit/
          audit.controller.ts
          audit.routes.ts
          audit.service.ts
        auth/
          auth.controller.ts
          auth.routes.ts
          auth.schema.ts
          auth.service.ts
        aws/
          aws.controller.ts
          aws.routes.ts
          aws.service.ts
          aws.types.ts
        deployments/
          deployment.controller.ts
          deployment.routes.ts
          deployment.service.ts
        environments/
          environment.controller.ts
          environment.routes.ts
          environment.schema.ts
          environment.service.ts
        github/
          github.controller.ts
          github.routes.ts
          github.service.ts
          github.types.ts
        webhooks/
          webhook.controller.ts
          webhook.routes.ts
          webhook.service.ts
        websocket/
          socket.middleware.ts
          socket.server.ts
          socket.service.ts
          socket.types.ts
      utils/
        auditLog.ts
        awsClient.ts
        deploymentStatus.ts
        emitDeploymentUpdate.ts
        encryption.ts
        githubClient.ts
        jwt.ts
        realtime.ts
        response.ts
        time.ts
        unifiedStatus.ts
        validateEnv.ts
  frontend/
    index.html
    package.json
    tsconfig.app.json
    tsconfig.json
    vite.config.ts
    src/
      App.tsx
      main.tsx
      styles.css
      assets/
        icons/
          custom/
            .gitkeep
            audit-svgrepo-com.svg
            connect-svgrepo-com.svg
            DeployLens.png
            sign-out-left-2-svgrepo-com.svg
      components/
        auth/
          AuthButton.tsx
          AuthCard.tsx
          AuthInput.tsx
        dashboard/
          ActiveDeploymentsBanner.tsx
          CompareModal.tsx
          ConnectionStatus.tsx
          DensityToggle.tsx
          DeploymentDrawer.tsx
          DeploymentModal.tsx
          DeploymentRow.tsx
          EmptyState.tsx
          EnvironmentColumn.tsx
          EnvironmentSwimlanes.tsx
          ExportButton.tsx
          FailedDeploymentAlert.tsx
          FilterBar.tsx
          InsightBar.tsx
          InsightPanel.tsx
          KeyboardShortcutsModal.tsx
          LastGoodDeploy.tsx
          LoadingSkeleton.tsx
          LongRunningWarning.tsx
          PipelineTable.tsx
          Sidebar.tsx
          StatsRow.tsx
          StatusBadge.tsx
          StatusFilterChips.tsx
          TopDeployers.tsx
        layout/
          PageHeader.tsx
          ProtectedLayout.tsx
          SettingsLayout.tsx
        onboarding/
          AwsCredentialForm.tsx
          EnvironmentCard.tsx
          EnvironmentMapper.tsx
          RepoCard.tsx
          RepoSearch.tsx
          StepIndicator.tsx
        shared/
          AppErrorBoundary.tsx
          ConfirmModal.tsx
          CopyButton.tsx
          FormField.tsx
          Toast.tsx
          Tooltip.tsx
      hooks/
        useDeploymentDetail.ts
        useDeployments.ts
        useDeploymentSocket.ts
        useKeyboardShortcuts.ts
        useSocket.ts
        useSocketStatus.ts
        useToast.tsx
      lib/
        api.ts
        auth.ts
        csrf.ts
        formatters.ts
        socket.ts
      pages/
        AnalyticsPage.tsx
        DashboardPage.tsx
        LoginPage.tsx
        RegisterPage.tsx
        SettingsPage.tsx
        onboarding/
          ConnectAwsPage.tsx
          ConnectGithubPage.tsx
          MapEnvironmentsPage.tsx
          OnboardingLayout.tsx
          SelectReposPage.tsx
        settings/
          AuditLogPage.tsx
          EnvironmentsPage.tsx
          IntegrationsPage.tsx
          ProfilePage.tsx
          RepositoriesPage.tsx
          SecurityPage.tsx
          settingsHelpers.ts
      store/
        authStore.ts
        awsStore.ts
        deploymentStore.ts
      styles/
        tokens.css
      types/
        socket.types.ts
```

## License

MIT License

## Author / Contact

Nirjar Goswami  
GitHub: https://github.com/Nirjar26

