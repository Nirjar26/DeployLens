import bcrypt from "bcrypt";
import crypto from "crypto";
import { PrismaClient, UnifiedStatus } from "@prisma/client";
import { encrypt } from "../src/utils/encryption";

const prisma = new PrismaClient();

const COMMIT_MESSAGES = [
  "feat: add user authentication middleware",
  "fix: resolve memory leak in connection pool",
  "feat: implement payment webhook handler",
  "chore: upgrade dependencies to latest versions",
  "fix: correct pagination offset calculation",
  "feat: add rate limiting to public endpoints",
  "fix: handle null values in user profile response",
  "perf: optimize database query for dashboard metrics",
  "feat: add email notification service",
  "fix: resolve race condition in job queue",
  "chore: update Docker base image to node 20",
  "feat: implement CSV export for analytics",
  "fix: correct timezone handling in scheduler",
  "refactor: extract payment logic into service layer",
  "feat: add health check endpoint",
  "fix: resolve CORS issue on preflight requests",
  "feat: implement retry logic for failed webhooks",
  "chore: clean up deprecated API endpoints",
  "fix: handle edge case in token refresh flow",
  "feat: add structured logging with correlation IDs",
] as const;

const BRANCHES = [
  "main",
  "release/v2.4.1",
  "release/v2.4.0",
  "hotfix/payment-null-fix",
  "hotfix/auth-timeout",
  "feature/user-notifications",
  "feature/csv-export",
] as const;

const TRIGGERED_BY = [
  "alex-rivera-dev",
  "sarah-k-eng",
  "marcos-b",
  "ci-bot[bot]",
  "github-actions[bot]",
] as const;

type RepoKey = "api" | "web" | "worker";
type EnvKey = "production" | "staging" | "development";

type UserSeedConfig = {
  name: string;
  email: string;
  githubUserId: string;
  githubUsername: string;
  githubEmail: string;
  githubTokenPlain: string;
  awsAlias: string;
  repoIds: {
    api: number;
    web: number;
    worker: number;
  };
  runPrefix: string;
  progPrefix: string;
  codedeployPrefix: string;
};

type DeploymentSeedInput = {
  githubRunId: string;
  codedeployId: string | null;
  repositoryId: string;
  environmentId: string;
  commitSha?: string;
  branch: string;
  commitMessage: string;
  triggeredBy: string;
  githubStatus: string | null;
  codedeployStatus: string | null;
  unifiedStatus: UnifiedStatus;
  isRollback?: boolean;
  rolledBackFromId?: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationSeconds: number | null;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number, hour?: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour ?? randomInt(9, 17), randomInt(0, 59), 0, 0);
  return d;
}

function hoursAgo(hours: number, minuteOffset = 0): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() + minuteOffset, 0, 0);
  return d;
}

function isWeekdayOffset(dayOffset: number): boolean {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  const wd = d.getDay();
  return wd >= 1 && wd <= 5;
}

function pickWeightedDay(minDay: number, maxDay: number): number {
  while (true) {
    const day = randomInt(minDay, maxDay);
    if (Math.random() < (isWeekdayOffset(day) ? 0.82 : 0.3)) {
      return day;
    }
  }
}

function pickBranch(env: EnvKey): string {
  if (env === "production" && Math.random() < 0.6) {
    return "main";
  }

  const nonMain = BRANCHES.filter((b) => b !== "main");
  return nonMain[randomInt(0, nonMain.length - 1)];
}

function lifecycleEventId(deploymentId: string, source: string, eventName: string): string {
  return `seed_evt_${deploymentId}_${source}_${eventName}`;
}

async function upsertDeployment(userId: string, input: DeploymentSeedInput) {
  const commitSha = input.commitSha ?? crypto.randomBytes(20).toString("hex");

  return prisma.deployment.upsert({
    where: { github_run_id: input.githubRunId },
    update: {
      user_id: userId,
      repository_id: input.repositoryId,
      environment_id: input.environmentId,
      commit_sha: commitSha,
      branch: input.branch,
      commit_message: input.commitMessage,
      triggered_by: input.triggeredBy,
      github_status: input.githubStatus,
      github_run_url: `https://github.com/acme-corp/actions/runs/${input.githubRunId}`,
      codedeploy_id: input.codedeployId,
      codedeploy_status: input.codedeployStatus,
      unified_status: input.unifiedStatus,
      is_rollback: input.isRollback ?? false,
      rolled_back_from_id: input.rolledBackFromId ?? null,
      created_at: input.createdAt,
      started_at: input.startedAt,
      finished_at: input.finishedAt,
      duration_seconds: input.durationSeconds,
    },
    create: {
      user_id: userId,
      repository_id: input.repositoryId,
      environment_id: input.environmentId,
      commit_sha: commitSha,
      branch: input.branch,
      commit_message: input.commitMessage,
      triggered_by: input.triggeredBy,
      github_run_id: input.githubRunId,
      github_status: input.githubStatus,
      github_run_url: `https://github.com/acme-corp/actions/runs/${input.githubRunId}`,
      codedeploy_id: input.codedeployId,
      codedeploy_status: input.codedeployStatus,
      unified_status: input.unifiedStatus,
      is_rollback: input.isRollback ?? false,
      rolled_back_from_id: input.rolledBackFromId ?? null,
      created_at: input.createdAt,
      started_at: input.startedAt,
      finished_at: input.finishedAt,
      duration_seconds: input.durationSeconds,
    },
  });
}

async function upsertLifecycleEvent(input: {
  deploymentId: string;
  source: string;
  eventName: string;
  status: string;
  startedAt: Date;
  durationSeconds: number | null;
  message?: string;
}) {
  const endedAt =
    input.durationSeconds === null
      ? null
      : new Date(input.startedAt.getTime() + input.durationSeconds * 1000);

  await prisma.deploymentEvent.upsert({
    where: {
      id: lifecycleEventId(input.deploymentId, input.source, input.eventName),
    },
    update: {
      deployment_id: input.deploymentId,
      source: input.source,
      event_name: input.eventName,
      status: input.status,
      message: input.message ?? null,
      started_at: input.startedAt,
      ended_at: endedAt,
      duration_ms: input.durationSeconds === null ? null : input.durationSeconds * 1000,
    },
    create: {
      id: lifecycleEventId(input.deploymentId, input.source, input.eventName),
      deployment_id: input.deploymentId,
      source: input.source,
      event_name: input.eventName,
      status: input.status,
      message: input.message ?? null,
      started_at: input.startedAt,
      ended_at: endedAt,
      duration_ms: input.durationSeconds === null ? null : input.durationSeconds * 1000,
    },
  });
}

async function seedLifecycleForDeployment(input: {
  deploymentId: string;
  startedAt: Date;
  statuses: [string, string, string, string, string];
  durations: [number | null, number | null, number | null, number | null, number | null];
  failureMessage?: string;
}) {
  const names = ["ApplicationStop", "BeforeInstall", "AfterInstall", "ApplicationStart", "ValidateService"] as const;
  const offsets = [0, 15, 95, 160, 210];

  for (let i = 0; i < names.length; i += 1) {
    await upsertLifecycleEvent({
      deploymentId: input.deploymentId,
      source: "codedeploy",
      eventName: names[i],
      status: input.statuses[i],
      startedAt: new Date(input.startedAt.getTime() + offsets[i] * 1000),
      durationSeconds: input.durations[i],
      message: i === 2 ? input.failureMessage : undefined,
    });
  }
}

async function seedUserData(config: UserSeedConfig, passwordHash: string) {
  // 1. Upsert user
  const user = await prisma.user.upsert({
    where: { email: config.email },
    update: {
      name: config.name,
      password_hash: passwordHash,
    },
    create: {
      name: config.name,
      email: config.email,
      password_hash: passwordHash,
    },
  });

  // 2. Upsert github connection (direct DB upsert only)
  await prisma.githubConnection.upsert({
    where: { user_id: user.id },
    update: {
      github_user_id: config.githubUserId,
      github_username: config.githubUsername,
      github_email: config.githubEmail,
      access_token_enc: encrypt(config.githubTokenPlain),
    },
    create: {
      user_id: user.id,
      github_user_id: config.githubUserId,
      github_username: config.githubUsername,
      github_email: config.githubEmail,
      access_token_enc: encrypt(config.githubTokenPlain),
    },
  });

  // 3. Upsert aws connection (direct DB upsert only)
  await prisma.awsConnection.upsert({
    where: { user_id: user.id },
    update: {
      access_key_id_enc: encrypt("AKIASEEDFAKEKEY00001"),
      secret_key_enc: encrypt("seedFakeSecretKey/NotReal+ForDemoOnly"),
      region: "us-east-1",
      account_id: "123456789012",
      account_alias: config.awsAlias,
    },
    create: {
      user_id: user.id,
      access_key_id_enc: encrypt("AKIASEEDFAKEKEY00001"),
      secret_key_enc: encrypt("seedFakeSecretKey/NotReal+ForDemoOnly"),
      region: "us-east-1",
      account_id: "123456789012",
      account_alias: config.awsAlias,
    },
  });

  // 4. Upsert repositories
  const apiRepo = await prisma.repository.upsert({
    where: { github_repo_id: config.repoIds.api },
    update: {
      user_id: user.id,
      owner: "acme-corp",
      name: "api-service",
      full_name: "acme-corp/api-service",
      private: true,
      default_branch: "main",
      webhook_secret: `seed_webhook_secret_api_service_${config.runPrefix}`,
      is_active: true,
    },
    create: {
      user_id: user.id,
      github_repo_id: config.repoIds.api,
      owner: "acme-corp",
      name: "api-service",
      full_name: "acme-corp/api-service",
      private: true,
      default_branch: "main",
      webhook_secret: `seed_webhook_secret_api_service_${config.runPrefix}`,
      is_active: true,
    },
  });

  const webRepo = await prisma.repository.upsert({
    where: { github_repo_id: config.repoIds.web },
    update: {
      user_id: user.id,
      owner: "acme-corp",
      name: "web-frontend",
      full_name: "acme-corp/web-frontend",
      private: true,
      default_branch: "main",
      webhook_secret: `seed_webhook_secret_web_frontend_${config.runPrefix}`,
      is_active: true,
    },
    create: {
      user_id: user.id,
      github_repo_id: config.repoIds.web,
      owner: "acme-corp",
      name: "web-frontend",
      full_name: "acme-corp/web-frontend",
      private: true,
      default_branch: "main",
      webhook_secret: `seed_webhook_secret_web_frontend_${config.runPrefix}`,
      is_active: true,
    },
  });

  const workerRepo = await prisma.repository.upsert({
    where: { github_repo_id: config.repoIds.worker },
    update: {
      user_id: user.id,
      owner: "acme-corp",
      name: "worker-service",
      full_name: "acme-corp/worker-service",
      private: true,
      default_branch: "main",
      webhook_secret: `seed_webhook_secret_worker_service_${config.runPrefix}`,
      is_active: true,
    },
    create: {
      user_id: user.id,
      github_repo_id: config.repoIds.worker,
      owner: "acme-corp",
      name: "worker-service",
      full_name: "acme-corp/worker-service",
      private: true,
      default_branch: "main",
      webhook_secret: `seed_webhook_secret_worker_service_${config.runPrefix}`,
      is_active: true,
    },
  });

  // 5. Upsert environments
  const apiProduction = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: user.id,
        codedeploy_app: "acme-api-service",
        codedeploy_group: "api-service-production",
      },
    },
    update: {
      repository_id: apiRepo.id,
      display_name: "production",
      color_tag: "#ef4444",
    },
    create: {
      user_id: user.id,
      repository_id: apiRepo.id,
      codedeploy_app: "acme-api-service",
      codedeploy_group: "api-service-production",
      display_name: "production",
      color_tag: "#ef4444",
    },
  });

  const apiStaging = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: user.id,
        codedeploy_app: "acme-api-service",
        codedeploy_group: "api-service-staging",
      },
    },
    update: {
      repository_id: apiRepo.id,
      display_name: "staging",
      color_tag: "#f97316",
    },
    create: {
      user_id: user.id,
      repository_id: apiRepo.id,
      codedeploy_app: "acme-api-service",
      codedeploy_group: "api-service-staging",
      display_name: "staging",
      color_tag: "#f97316",
    },
  });

  const apiDevelopment = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: user.id,
        codedeploy_app: "acme-api-service",
        codedeploy_group: "api-service-dev",
      },
    },
    update: {
      repository_id: apiRepo.id,
      display_name: "development",
      color_tag: "#22c55e",
    },
    create: {
      user_id: user.id,
      repository_id: apiRepo.id,
      codedeploy_app: "acme-api-service",
      codedeploy_group: "api-service-dev",
      display_name: "development",
      color_tag: "#22c55e",
    },
  });

  const webProduction = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: user.id,
        codedeploy_app: "acme-web-frontend",
        codedeploy_group: "web-frontend-production",
      },
    },
    update: {
      repository_id: webRepo.id,
      display_name: "production",
      color_tag: "#ef4444",
    },
    create: {
      user_id: user.id,
      repository_id: webRepo.id,
      codedeploy_app: "acme-web-frontend",
      codedeploy_group: "web-frontend-production",
      display_name: "production",
      color_tag: "#ef4444",
    },
  });

  const webStaging = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: user.id,
        codedeploy_app: "acme-web-frontend",
        codedeploy_group: "web-frontend-staging",
      },
    },
    update: {
      repository_id: webRepo.id,
      display_name: "staging",
      color_tag: "#f97316",
    },
    create: {
      user_id: user.id,
      repository_id: webRepo.id,
      codedeploy_app: "acme-web-frontend",
      codedeploy_group: "web-frontend-staging",
      display_name: "staging",
      color_tag: "#f97316",
    },
  });

  const workerProduction = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: user.id,
        codedeploy_app: "acme-worker-service",
        codedeploy_group: "worker-service-production",
      },
    },
    update: {
      repository_id: workerRepo.id,
      display_name: "production",
      color_tag: "#ef4444",
    },
    create: {
      user_id: user.id,
      repository_id: workerRepo.id,
      codedeploy_app: "acme-worker-service",
      codedeploy_group: "worker-service-production",
      display_name: "production",
      color_tag: "#ef4444",
    },
  });

  const repos: Record<RepoKey, string> = {
    api: apiRepo.id,
    web: webRepo.id,
    worker: workerRepo.id,
  };

  const envs: Record<string, string> = {
    api_production: apiProduction.id,
    api_staging: apiStaging.id,
    api_development: apiDevelopment.id,
    web_production: webProduction.id,
    web_staging: webStaging.id,
    worker_production: workerProduction.id,
    worker_staging: workerProduction.id,
    worker_development: workerProduction.id,
  };

  // 6. Upsert handcrafted deployments 1-7
  const dep1Start = hoursAgo(0, -25);
  const deployment1 = await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_001`,
    codedeployId: `${config.codedeployPrefix}00001`,
    repositoryId: repos.api,
    environmentId: envs.api_production,
    branch: "main",
    commitMessage: "feat: add rate limiting to public endpoints",
    triggeredBy: config.githubUsername,
    githubStatus: "in_progress",
    codedeployStatus: "InProgress",
    unifiedStatus: UnifiedStatus.running,
    createdAt: dep1Start,
    startedAt: dep1Start,
    finishedAt: null,
    durationSeconds: null,
  });

  const dep2Start = hoursAgo(1, -5);
  await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_002`,
    codedeployId: `${config.codedeployPrefix}00002`,
    repositoryId: repos.web,
    environmentId: envs.web_production,
    branch: "main",
    commitMessage: "feat: implement CSV export for analytics",
    triggeredBy: "sarah-k-eng",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    createdAt: dep2Start,
    startedAt: dep2Start,
    finishedAt: new Date(dep2Start.getTime() + 487 * 1000),
    durationSeconds: 487,
  });

  const dep3Start = hoursAgo(3);
  await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_003`,
    codedeployId: `${config.codedeployPrefix}00003`,
    repositoryId: repos.api,
    environmentId: envs.api_staging,
    branch: "feature/user-notifications",
    commitMessage: "fix: resolve race condition in job queue",
    triggeredBy: "marcos-b",
    githubStatus: "success",
    codedeployStatus: "Failed",
    unifiedStatus: UnifiedStatus.failed,
    createdAt: dep3Start,
    startedAt: dep3Start,
    finishedAt: new Date(dep3Start.getTime() + 243 * 1000),
    durationSeconds: 243,
  });

  const dep4Start = hoursAgo(5);
  await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_004`,
    codedeployId: `${config.codedeployPrefix}00004`,
    repositoryId: repos.worker,
    environmentId: envs.worker_production,
    branch: "main",
    commitMessage: "chore: update Docker base image to node 20",
    triggeredBy: "github-actions[bot]",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    createdAt: dep4Start,
    startedAt: dep4Start,
    finishedAt: new Date(dep4Start.getTime() + 412 * 1000),
    durationSeconds: 412,
  });

  const dep5Start = hoursAgo(0, -15);
  await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_005`,
    codedeployId: null,
    repositoryId: repos.api,
    environmentId: envs.api_development,
    branch: "feature/csv-export",
    commitMessage: "refactor: extract payment logic into service layer",
    triggeredBy: config.githubUsername,
    githubStatus: "queued",
    codedeployStatus: null,
    unifiedStatus: UnifiedStatus.pending,
    createdAt: dep5Start,
    startedAt: dep5Start,
    finishedAt: null,
    durationSeconds: null,
  });

  const dep6Start = daysAgo(1, 14);
  const deployment6 = await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_006`,
    codedeployId: `${config.codedeployPrefix}00006`,
    repositoryId: repos.api,
    environmentId: envs.api_production,
    branch: "main",
    commitMessage: "feat: implement payment webhook handler",
    triggeredBy: "sarah-k-eng",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.rolled_back,
    isRollback: false,
    createdAt: dep6Start,
    startedAt: dep6Start,
    finishedAt: new Date(dep6Start.getTime() + 498 * 1000),
    durationSeconds: 498,
  });

  const dep7Start = daysAgo(1, 14);
  dep7Start.setMinutes(30, 0, 0);
  const deployment7 = await upsertDeployment(user.id, {
    githubRunId: `${config.runPrefix}_run_007`,
    codedeployId: `${config.codedeployPrefix}00007`,
    repositoryId: repos.api,
    environmentId: envs.api_production,
    branch: "main",
    commitMessage: "fix: resolve memory leak in connection pool",
    triggeredBy: config.githubUsername,
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    isRollback: true,
    rolledBackFromId: deployment6.id,
    createdAt: dep7Start,
    startedAt: dep7Start,
    finishedAt: new Date(dep7Start.getTime() + 361 * 1000),
    durationSeconds: 361,
  });

  // 7. Upsert remaining 33 programmatic deployments
  const repoRemaining: Record<RepoKey, number> = { api: 19, web: 9, worker: 5 };
  const envRemaining: Record<EnvKey, number> = { production: 23, staging: 7, development: 3 };

  const statuses: UnifiedStatus[] = [
    UnifiedStatus.success,
    UnifiedStatus.success,
    UnifiedStatus.failed,
    ...Array.from({ length: 25 }, () => UnifiedStatus.success),
    ...Array.from({ length: 3 }, () => UnifiedStatus.failed),
    ...Array.from({ length: 2 }, () => UnifiedStatus.running),
  ];

  // Keep first 3 fixed (today), shuffle the remaining 30.
  for (let i = statuses.length - 1; i > 2; i -= 1) {
    const j = randomInt(3, i);
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  const forced: Array<{ repo: RepoKey; env: EnvKey; hours: number; status: UnifiedStatus }> = [
    { repo: "api", env: "production", hours: 2, status: UnifiedStatus.success },
    { repo: "web", env: "staging", hours: 4, status: UnifiedStatus.success },
    { repo: "worker", env: "production", hours: 6, status: UnifiedStatus.failed },
  ];

  let failedProdCount = 1; // forced[2]
  let msgIndex = 0;
  let actorIndex = 0;

  for (let i = 0; i < 33; i += 1) {
    const status = statuses[i];

    let repoChoice: RepoKey;
    let envChoice: EnvKey;
    let createdAt: Date;

    if (i < 3) {
      repoChoice = forced[i].repo;
      envChoice = forced[i].env;
      createdAt = hoursAgo(forced[i].hours);
    } else {
      const envCandidates = (Object.keys(envRemaining) as EnvKey[]).filter((env) => envRemaining[env] > 0);
      envChoice = envCandidates[randomInt(0, envCandidates.length - 1)];

      if (status === UnifiedStatus.running) {
        envChoice = envRemaining.production > 0 ? "production" : "staging";
      }

      if (envChoice === "development") {
        repoChoice = "api";
      } else if (envChoice === "staging") {
        const options = (["api", "web"] as RepoKey[]).filter((r) => repoRemaining[r] > 0);
        repoChoice = options[randomInt(0, options.length - 1)];
      } else {
        const options = (["api", "web", "worker"] as RepoKey[]).filter((r) => repoRemaining[r] > 0);
        repoChoice = options[randomInt(0, options.length - 1)];
      }

      if (status === UnifiedStatus.failed && failedProdCount < 3) {
        envChoice = "production";
        failedProdCount += 1;
      }

      const clusterDay = [3, 5, 8, 13, 17, 22, 28][randomInt(0, 6)];
      const dayOffset = Math.random() < 0.4 ? clusterDay : pickWeightedDay(2, 30);
      createdAt = daysAgo(dayOffset, randomInt(9, 17));
    }

    repoRemaining[repoChoice] -= 1;
    envRemaining[envChoice] -= 1;

    let durationSeconds: number | null = null;
    let finishedAt: Date | null = null;
    let githubStatus = "in_progress";
    let codedeployStatus: string | null = "InProgress";

    if (status === UnifiedStatus.success) {
      durationSeconds = randomInt(240, 720);
      finishedAt = new Date(createdAt.getTime() + durationSeconds * 1000);
      githubStatus = "success";
      codedeployStatus = "Succeeded";
    } else if (status === UnifiedStatus.failed) {
      durationSeconds = randomInt(180, 480);
      finishedAt = new Date(createdAt.getTime() + durationSeconds * 1000);
      githubStatus = "success";
      codedeployStatus = "Failed";
    }

    await upsertDeployment(user.id, {
      githubRunId: `${config.progPrefix}_${i + 1}`,
      codedeployId: `${config.codedeployPrefix}P${String(i + 1).padStart(4, "0")}`,
      repositoryId: repos[repoChoice],
      environmentId: envs[`${repoChoice}_${envChoice}`],
      branch: pickBranch(envChoice),
      commitMessage: COMMIT_MESSAGES[msgIndex % COMMIT_MESSAGES.length],
      triggeredBy: TRIGGERED_BY[actorIndex % TRIGGERED_BY.length],
      githubStatus,
      codedeployStatus,
      unifiedStatus: status,
      createdAt,
      startedAt: createdAt,
      finishedAt,
      durationSeconds,
    });

    msgIndex += 1;
    actorIndex += 1;
  }

  // 8. Upsert deployment events for handcrafted 1-7 (except pending #5)
  await seedLifecycleForDeployment({
    deploymentId: deployment1.id,
    startedAt: dep1Start,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "InProgress", "Pending"],
    durations: [8, 45, 23, null, null],
  });

  const deployment2 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: `${config.runPrefix}_run_002` } });
  await seedLifecycleForDeployment({
    deploymentId: deployment2.id,
    startedAt: dep2Start,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [6, 52, 18, 12, 30],
  });

  const deployment3 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: `${config.runPrefix}_run_003` } });
  await seedLifecycleForDeployment({
    deploymentId: deployment3.id,
    startedAt: dep3Start,
    statuses: ["Succeeded", "Succeeded", "Failed", "Skipped", "Skipped"],
    durations: [5, 48, 15, null, null],
    failureMessage:
      "Script at specified location: scripts/after_install.sh run as user root failed with exit code 1",
  });

  const deployment4 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: `${config.runPrefix}_run_004` } });
  await seedLifecycleForDeployment({
    deploymentId: deployment4.id,
    startedAt: dep4Start,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [7, 61, 19, 14, 28],
  });

  await seedLifecycleForDeployment({
    deploymentId: deployment6.id,
    startedAt: dep6Start,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [9, 55, 22, 11, 35],
  });

  await seedLifecycleForDeployment({
    deploymentId: deployment7.id,
    startedAt: dep7Start,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [8, 49, 21, 13, 29],
  });
}

async function main() {
  const sharedPasswordHash = await bcrypt.hash("demo1234", 12);

  const alexConfig: UserSeedConfig = {
    name: "Alex Rivera",
    email: "alex@deploylens.dev",
    githubUserId: "48291047",
    githubUsername: "alex-rivera-dev",
    githubEmail: "alex@deploylens.dev",
    githubTokenPlain: "ghp_fakeSeedTokenNotReal1234567890abc",
    awsAlias: "acme-production",
    repoIds: {
      api: 701234501,
      web: 701234502,
      worker: 701234503,
    },
    runPrefix: "seed_alex",
    progPrefix: "seed_prog_deployment",
    codedeployPrefix: "d-SEEDA",
  };

  const samConfig: UserSeedConfig = {
    name: "Sam Chen",
    email: "sam@deploylens.dev",
    githubUserId: "59302158",
    githubUsername: "sam-chen-dev",
    githubEmail: "sam@deploylens.dev",
    githubTokenPlain: "ghp_fakeSeedTokenSamNotReal9876543210xyz",
    awsAlias: "acme-staging",
    repoIds: {
      api: 801234501,
      web: 801234502,
      worker: 801234503,
    },
    runPrefix: "seed_sam",
    progPrefix: "seed_sam_prog_deployment",
    codedeployPrefix: "d-SEEDS",
  };

  await seedUserData(alexConfig, sharedPasswordHash);
  await seedUserData(samConfig, sharedPasswordHash);

  console.log("\n=============================");
  console.log("  DeployLens Seed Complete");
  console.log("=============================");
  console.log("\nTest Accounts:");
  console.log("  Email: alex@deploylens.dev");
  console.log("  Password: demo1234");
  console.log("");
  console.log("  Email: sam@deploylens.dev");
  console.log("  Password: demo1234");
  console.log("\nSeeded:");
  console.log("  2 users");
  console.log("  6 repositories");
  console.log("  12 environments");
  console.log("  80 deployments");
  console.log("  ~60 deployment events");
  console.log("\nRun: npx prisma studio");
  console.log("to inspect the seeded data.");
  console.log("=============================\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
