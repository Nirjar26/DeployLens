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
];

const BRANCHES = [
  "main",
  "release/v2.4.1",
  "release/v2.4.0",
  "hotfix/payment-null-fix",
  "hotfix/auth-timeout",
  "feature/user-notifications",
  "feature/csv-export",
];

const TRIGGERED_BY = [
  "alex-rivera-dev",
  "sarah-k-eng",
  "marcos-b",
  "ci-bot[bot]",
  "github-actions[bot]",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number, hour?: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour ?? Math.floor(Math.random() * 8) + 9);
  d.setMinutes(Math.floor(Math.random() * 60));
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

function hoursAgo(hours: number, minuteOffset = 0): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() + minuteOffset);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

function isWeekdayForDayOffset(dayOffset: number): boolean {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function pickWeightedDayOffset(minDay: number, maxDay: number): number {
  while (true) {
    const day = randomInt(minDay, maxDay);
    const weekday = isWeekdayForDayOffset(day);
    if (Math.random() < (weekday ? 0.85 : 0.35)) {
      return day;
    }
  }
}

function pickBranch(displayName: string): string {
  if (displayName === "production" && Math.random() < 0.6) {
    return "main";
  }

  const nonMain = BRANCHES.filter((b) => b !== "main");
  return nonMain[randomInt(0, nonMain.length - 1)];
}

type RepoKey = "api" | "web" | "worker";
type EnvKey = "production" | "staging" | "development";

type DeploymentSeedInput = {
  githubRunId: string;
  codedeployId: string | null;
  repositoryId: string;
  environmentId: string;
  commitMessage: string;
  branch: string;
  triggeredBy: string;
  githubStatus: string | null;
  codedeployStatus: string | null;
  unifiedStatus: UnifiedStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationSeconds: number | null;
  isRollback?: boolean;
  rolledBackFromId?: string | null;
  commitSha?: string;
};

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
      codedeploy_id: input.codedeployId,
      codedeploy_status: input.codedeployStatus,
      unified_status: input.unifiedStatus,
      is_rollback: input.isRollback ?? false,
      rolled_back_from_id: input.rolledBackFromId ?? null,
      started_at: input.startedAt,
      finished_at: input.finishedAt,
      duration_seconds: input.durationSeconds,
      github_run_url: `https://github.com/acme-corp/actions/runs/${input.githubRunId}`,
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
      started_at: input.startedAt,
      finished_at: input.finishedAt,
      duration_seconds: input.durationSeconds,
    },
  });
}

function eventStableId(deploymentId: string, source: string, eventName: string): string {
  return `seed_evt_${deploymentId}_${source}_${eventName}`;
}

async function upsertEvent(params: {
  deploymentId: string;
  source: string;
  eventName: string;
  status: string;
  durationSeconds: number | null;
  message?: string;
  startedAt: Date;
}) {
  const endedAt =
    params.durationSeconds === null
      ? null
      : new Date(params.startedAt.getTime() + params.durationSeconds * 1000);

  await prisma.deploymentEvent.upsert({
    where: {
      id: eventStableId(params.deploymentId, params.source, params.eventName),
    },
    update: {
      deployment_id: params.deploymentId,
      source: params.source,
      event_name: params.eventName,
      status: params.status,
      message: params.message ?? null,
      started_at: params.startedAt,
      ended_at: endedAt,
      duration_ms: params.durationSeconds === null ? null : params.durationSeconds * 1000,
    },
    create: {
      id: eventStableId(params.deploymentId, params.source, params.eventName),
      deployment_id: params.deploymentId,
      source: params.source,
      event_name: params.eventName,
      status: params.status,
      message: params.message ?? null,
      started_at: params.startedAt,
      ended_at: endedAt,
      duration_ms: params.durationSeconds === null ? null : params.durationSeconds * 1000,
    },
  });
}

function generateLifecycleStarts(base: Date): Date[] {
  const offsets = [0, 15, 95, 160, 210];
  return offsets.map((seconds) => new Date(base.getTime() + seconds * 1000));
}

async function seedDeploymentLifecycleEvents(params: {
  deploymentId: string;
  startedAt: Date;
  statuses: [string, string, string, string, string];
  durations: [number | null, number | null, number | null, number | null, number | null];
  failureMessage?: string;
}) {
  const lifecycle = ["ApplicationStop", "BeforeInstall", "AfterInstall", "ApplicationStart", "ValidateService"] as const;
  const starts = generateLifecycleStarts(params.startedAt);

  for (let i = 0; i < lifecycle.length; i += 1) {
    await upsertEvent({
      deploymentId: params.deploymentId,
      source: "codedeploy",
      eventName: lifecycle[i],
      status: params.statuses[i],
      durationSeconds: params.durations[i],
      message: i === 2 ? params.failureMessage : undefined,
      startedAt: starts[i],
    });
  }
}

async function main() {
  const alexPasswordHash = await bcrypt.hash("demo1234", 12);
  const samPasswordHash = await bcrypt.hash("demo1234", 12);

  // 1. Upsert users
  const alex = await prisma.user.upsert({
    where: { email: "alex@deploylens.dev" },
    update: {
      name: "Alex Rivera",
      password_hash: alexPasswordHash,
    },
    create: {
      name: "Alex Rivera",
      email: "alex@deploylens.dev",
      password_hash: alexPasswordHash,
    },
  });

  const sam = await prisma.user.upsert({
    where: { email: "sam@deploylens.dev" },
    update: {
      name: "Sam Chen",
      password_hash: samPasswordHash,
    },
    create: {
      name: "Sam Chen",
      email: "sam@deploylens.dev",
      password_hash: samPasswordHash,
    },
  });

  // 2. Upsert github connection
  await prisma.githubConnection.upsert({
    where: { user_id: alex.id },
    update: {
      github_user_id: "48291047",
      github_username: "alex-rivera-dev",
      github_email: "alex@deploylens.dev",
      access_token_enc: encrypt("ghp_fakeSeedTokenNotReal1234567890abc"),
    },
    create: {
      user_id: alex.id,
      github_user_id: "48291047",
      github_username: "alex-rivera-dev",
      github_email: "alex@deploylens.dev",
      access_token_enc: encrypt("ghp_fakeSeedTokenNotReal1234567890abc"),
    },
  });

  // 3. Upsert aws connection
  await prisma.awsConnection.upsert({
    where: { user_id: alex.id },
    update: {
      access_key_id_enc: encrypt("AKIASEEDFAKEKEY00001"),
      secret_key_enc: encrypt("seedFakeSecretKey/NotReal+ForDemoOnly"),
      region: "us-east-1",
      account_id: "123456789012",
      account_alias: "acme-production",
    },
    create: {
      user_id: alex.id,
      access_key_id_enc: encrypt("AKIASEEDFAKEKEY00001"),
      secret_key_enc: encrypt("seedFakeSecretKey/NotReal+ForDemoOnly"),
      region: "us-east-1",
      account_id: "123456789012",
      account_alias: "acme-production",
    },
  });

  // 4. Upsert repositories
  const apiRepo = await prisma.repository.upsert({
    where: { github_repo_id: 701234501 },
    update: {
      user_id: alex.id,
      owner: "acme-corp",
      name: "api-service",
      full_name: "acme-corp/api-service",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_api_service_abc123",
      is_active: true,
    },
    create: {
      user_id: alex.id,
      github_repo_id: 701234501,
      owner: "acme-corp",
      name: "api-service",
      full_name: "acme-corp/api-service",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_api_service_abc123",
      is_active: true,
    },
  });

  const samRepo = await prisma.repository.upsert({
    where: { github_repo_id: 701234504 },
    update: {
      user_id: sam.id,
      owner: "acme-corp",
      name: "sam-service",
      full_name: "acme-corp/sam-service",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_sam_service_jkl012",
      is_active: true,
    },
    create: {
      user_id: sam.id,
      github_repo_id: 701234504,
      owner: "acme-corp",
      name: "sam-service",
      full_name: "acme-corp/sam-service",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_sam_service_jkl012",
      is_active: true,
    },
  });

  const webRepo = await prisma.repository.upsert({
    where: { github_repo_id: 701234502 },
    update: {
      user_id: alex.id,
      owner: "acme-corp",
      name: "web-frontend",
      full_name: "acme-corp/web-frontend",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_web_frontend_def456",
      is_active: true,
    },
    create: {
      user_id: alex.id,
      github_repo_id: 701234502,
      owner: "acme-corp",
      name: "web-frontend",
      full_name: "acme-corp/web-frontend",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_web_frontend_def456",
      is_active: true,
    },
  });

  const workerRepo = await prisma.repository.upsert({
    where: { github_repo_id: 701234503 },
    update: {
      user_id: alex.id,
      owner: "acme-corp",
      name: "worker-service",
      full_name: "acme-corp/worker-service",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_worker_service_ghi789",
      is_active: true,
    },
    create: {
      user_id: alex.id,
      github_repo_id: 701234503,
      owner: "acme-corp",
      name: "worker-service",
      full_name: "acme-corp/worker-service",
      private: true,
      default_branch: "main",
      webhook_secret: "seed_webhook_secret_worker_service_ghi789",
      is_active: true,
    },
  });

  const samEnv = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: sam.id,
        codedeploy_app: "acme-sam-service",
        codedeploy_group: "sam-service-production",
      },
    },
    update: {
      repository_id: samRepo.id,
      display_name: "production",
      color_tag: "#4f46e5",
    },
    create: {
      user_id: sam.id,
      repository_id: samRepo.id,
      codedeploy_app: "acme-sam-service",
      codedeploy_group: "sam-service-production",
      display_name: "production",
      color_tag: "#4f46e5",
    },
  });

  // 5. Upsert environments
  const apiProduction = await prisma.environment.upsert({
    where: {
      user_id_codedeploy_app_codedeploy_group: {
        user_id: alex.id,
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
      user_id: alex.id,
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
        user_id: alex.id,
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
      user_id: alex.id,
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
        user_id: alex.id,
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
      user_id: alex.id,
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
        user_id: alex.id,
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
      user_id: alex.id,
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
        user_id: alex.id,
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
      user_id: alex.id,
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
        user_id: alex.id,
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
      user_id: alex.id,
      repository_id: workerRepo.id,
      codedeploy_app: "acme-worker-service",
      codedeploy_group: "worker-service-production",
      display_name: "production",
      color_tag: "#ef4444",
    },
  });

  const repoMap: Record<RepoKey | "sam", { id: string }> = {
    api: { id: apiRepo.id },
    web: { id: webRepo.id },
    worker: { id: workerRepo.id },
    sam: { id: samRepo.id },
  };

  const envMap: Record<string, { id: string; repo: RepoKey | "sam"; displayName: EnvKey }> = {
    api_production: { id: apiProduction.id, repo: "api", displayName: "production" },
    api_staging: { id: apiStaging.id, repo: "api", displayName: "staging" },
    api_development: { id: apiDevelopment.id, repo: "api", displayName: "development" },
    web_production: { id: webProduction.id, repo: "web", displayName: "production" },
    web_staging: { id: webStaging.id, repo: "web", displayName: "staging" },
    worker_production: { id: workerProduction.id, repo: "worker", displayName: "production" },
    sam_production: { id: samEnv.id, repo: "sam", displayName: "production" },
  };

  // 6. Upsert hand-crafted deployments 1-7
  const dep1Started = new Date(Date.now() - 25 * 60 * 1000);
  const deployment1 = await upsertDeployment(alex.id, {
    githubRunId: "seed_run_001",
    codedeployId: "d-SEED00001",
    repositoryId: apiRepo.id,
    environmentId: apiProduction.id,
    commitMessage: "feat: add rate limiting to public endpoints",
    branch: "main",
    triggeredBy: "alex-rivera-dev",
    githubStatus: "in_progress",
    codedeployStatus: "InProgress",
    unifiedStatus: UnifiedStatus.running,
    startedAt: dep1Started,
    finishedAt: null,
    durationSeconds: null,
  });

  const dep2Started = new Date(Date.now() - 65 * 60 * 1000);
  const dep2Finished = new Date(Date.now() - 55 * 60 * 1000);
  await upsertDeployment(alex.id, {
    githubRunId: "seed_run_002",
    codedeployId: "d-SEED00002",
    repositoryId: webRepo.id,
    environmentId: webProduction.id,
    commitMessage: "feat: implement CSV export for analytics",
    branch: "main",
    triggeredBy: "sarah-k-eng",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    startedAt: dep2Started,
    finishedAt: dep2Finished,
    durationSeconds: 487,
  });

  const dep3Started = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const dep3Finished = new Date(dep3Started.getTime() + 243 * 1000);
  await upsertDeployment(alex.id, {
    githubRunId: "seed_run_003",
    codedeployId: "d-SEED00003",
    repositoryId: apiRepo.id,
    environmentId: apiStaging.id,
    commitMessage: "fix: resolve race condition in job queue",
    branch: "feature/user-notifications",
    triggeredBy: "marcos-b",
    githubStatus: "success",
    codedeployStatus: "Failed",
    unifiedStatus: UnifiedStatus.failed,
    startedAt: dep3Started,
    finishedAt: dep3Finished,
    durationSeconds: 243,
  });

  const dep4Started = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const dep4Finished = new Date(dep4Started.getTime() + 412 * 1000);
  await upsertDeployment(alex.id, {
    githubRunId: "seed_run_004",
    codedeployId: "d-SEED00004",
    repositoryId: workerRepo.id,
    environmentId: workerProduction.id,
    commitMessage: "chore: update Docker base image to node 20",
    branch: "main",
    triggeredBy: "github-actions[bot]",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    startedAt: dep4Started,
    finishedAt: dep4Finished,
    durationSeconds: 412,
  });

  const dep5Started = new Date(Date.now() - 15 * 60 * 1000);
  await upsertDeployment(alex.id, {
    githubRunId: "seed_run_005",
    codedeployId: null,
    repositoryId: apiRepo.id,
    environmentId: apiDevelopment.id,
    commitMessage: "refactor: extract payment logic into service layer",
    branch: "feature/csv-export",
    triggeredBy: "alex-rivera-dev",
    githubStatus: "queued",
    codedeployStatus: null,
    unifiedStatus: UnifiedStatus.pending,
    startedAt: dep5Started,
    finishedAt: null,
    durationSeconds: null,
  });

  const dep6Started = daysAgo(1, 14);
  const dep6Finished = new Date(dep6Started.getTime() + 498 * 1000);
  const deployment6 = await upsertDeployment(alex.id, {
    githubRunId: "seed_run_006",
    codedeployId: "d-SEED00006",
    repositoryId: apiRepo.id,
    environmentId: apiProduction.id,
    commitMessage: "feat: implement payment webhook handler",
    branch: "main",
    triggeredBy: "sarah-k-eng",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.rolled_back,
    isRollback: false,
    startedAt: dep6Started,
    finishedAt: dep6Finished,
    durationSeconds: 498,
  });

  const dep7Started = daysAgo(1, 14);
  dep7Started.setMinutes(30);
  const dep7Finished = new Date(dep7Started.getTime() + 361 * 1000);
  const deployment7 = await upsertDeployment(alex.id, {
    githubRunId: "seed_run_007",
    codedeployId: "d-SEED00007",
    repositoryId: apiRepo.id,
    environmentId: apiProduction.id,
    commitMessage: "fix: resolve memory leak in connection pool",
    branch: "main",
    triggeredBy: "alex-rivera-dev",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    isRollback: true,
    rolledBackFromId: deployment6.id,
    startedAt: dep7Started,
    finishedAt: dep7Finished,
    durationSeconds: 361,
  });

  // Sam test data
  const samDep1Start = daysAgo(2, 11);
  await upsertDeployment(sam.id, {
    githubRunId: "seed_run_sam_001",
    codedeployId: "d-SEEDSAM00001",
    repositoryId: samRepo.id,
    environmentId: samEnv.id,
    commitMessage: "fix: handle null values in user profile response",
    branch: "main",
    triggeredBy: "sam-chen",
    githubStatus: "success",
    codedeployStatus: "Succeeded",
    unifiedStatus: UnifiedStatus.success,
    startedAt: samDep1Start,
    finishedAt: new Date(samDep1Start.getTime() + 320 * 1000),
    durationSeconds: 320,
  });

  const samDep2Start = daysAgo(1, 13);
  await upsertDeployment(sam.id, {
    githubRunId: "seed_run_sam_002",
    codedeployId: "d-SEEDSAM00002",
    repositoryId: samRepo.id,
    environmentId: samEnv.id,
    commitMessage: "feat: implement health check endpoint",
    branch: "feature/csv-export",
    triggeredBy: "sam-chen",
    githubStatus: "failed",
    codedeployStatus: "Failed",
    unifiedStatus: UnifiedStatus.failed,
    startedAt: samDep2Start,
    finishedAt: new Date(samDep2Start.getTime() + 260 * 1000),
    durationSeconds: 260,
  });

  const samDep3Start = hoursAgo(1);
  await upsertDeployment(sam.id, {
    githubRunId: "seed_run_sam_003",
    codedeployId: "d-SEEDSAM00003",
    repositoryId: samRepo.id,
    environmentId: samEnv.id,
    commitMessage: "chore: clean up deprecated API endpoints",
    branch: "main",
    triggeredBy: "ci-bot[bot]",
    githubStatus: "in_progress",
    codedeployStatus: "InProgress",
    unifiedStatus: UnifiedStatus.running,
    startedAt: samDep3Start,
    finishedAt: null,
    durationSeconds: null,
  });

  // 7. Upsert remaining 33 programmatic deployments
  const repoRemaining: Record<RepoKey, number> = { api: 19, web: 9, worker: 5 };
  const envRemaining: Record<EnvKey, number> = { production: 23, staging: 7, development: 3 };
  const statusPool: UnifiedStatus[] = [
    ...Array.from({ length: 27 }, () => UnifiedStatus.success),
    ...Array.from({ length: 4 }, () => UnifiedStatus.failed),
    ...Array.from({ length: 2 }, () => UnifiedStatus.running),
  ];

  for (let i = statusPool.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
  }

  const forcedRecent: Array<{ repo: RepoKey; env: EnvKey }> = [
    { repo: "web", env: "staging" },
    { repo: "worker", env: "production" },
  ];

  let productionFailedCount = 0;
  let messageIndex = 0;
  let actorIndex = 0;

  for (let i = 0; i < 33; i += 1) {
    let status = statusPool[i];
    let repoChoice: RepoKey;
    let envChoice: EnvKey;

    if (i < forcedRecent.length) {
      repoChoice = forcedRecent[i].repo;
      envChoice = forcedRecent[i].env;
    } else if (status === UnifiedStatus.running) {
      const runningEnvCandidates = (["production", "staging"] as EnvKey[]).filter(
        (env) => envRemaining[env] > 0,
      );
      envChoice =
        runningEnvCandidates.length > 0
          ? runningEnvCandidates[randomInt(0, runningEnvCandidates.length - 1)]
          : "production";
      const runningRepoCandidates: RepoKey[] =
        envChoice === "staging"
          ? ["api", "web"].filter((repo) => repoRemaining[repo] > 0)
          : ["api", "web", "worker"].filter((repo) => repoRemaining[repo] > 0);
      repoChoice = runningRepoCandidates[randomInt(0, runningRepoCandidates.length - 1)];
    } else {
      const envCandidates: EnvKey[] = ["production", "staging", "development"].filter((env) => {
        if (envRemaining[env] <= 0) {
          return false;
        }

        if (env === "development") {
          return repoRemaining.api > 0;
        }

        if (env === "staging") {
          return repoRemaining.api > 0 || repoRemaining.web > 0;
        }

        return repoRemaining.api > 0 || repoRemaining.web > 0 || repoRemaining.worker > 0;
      });

      const fallbackEnvCandidates = (["production", "staging", "development"] as EnvKey[]).filter(
        (env) => envRemaining[env] > 0,
      );
      const effectiveEnvCandidates = envCandidates.length > 0 ? envCandidates : fallbackEnvCandidates;

      envChoice = effectiveEnvCandidates[randomInt(0, effectiveEnvCandidates.length - 1)];

      let repoCandidates: RepoKey[] = [];
      if (envChoice === "development") {
        repoCandidates = ["api"].filter((repo) => repoRemaining[repo] > 0);
      } else if (envChoice === "staging") {
        repoCandidates = ["api", "web"].filter((repo) => repoRemaining[repo] > 0);
      } else {
        repoCandidates = ["api", "web", "worker"].filter((repo) => repoRemaining[repo] > 0);
      }

      repoChoice = repoCandidates[randomInt(0, repoCandidates.length - 1)];
    }

    if (status === UnifiedStatus.failed && productionFailedCount < 3) {
      envChoice = "production";
      if (repoRemaining.worker <= 0 && repoChoice === "worker") {
        repoChoice = repoRemaining.api > 0 ? "api" : "web";
      }
      productionFailedCount += 1;
    }

    const envKey = `${repoChoice}_${envChoice}`;
    const env = envMap[envKey];

    repoRemaining[repoChoice] -= 1;
    envRemaining[envChoice] -= 1;

    let startedAt: Date;
    if (i < forcedRecent.length) {
      startedAt = daysAgo(randomInt(2, 6), randomInt(10, 16));
    } else if (status === UnifiedStatus.running) {
      startedAt = hoursAgo(randomInt(0, 1), -randomInt(5, 55));
    } else {
      const clustered = Math.random() < 0.45;
      const clusterDay = [3, 5, 8, 13, 17, 22, 28][randomInt(0, 6)];
      const dayOffset = clustered ? clusterDay : pickWeightedDayOffset(2, 30);
      startedAt = daysAgo(dayOffset, randomInt(9, 17));
    }

    let durationSeconds: number | null;
    let finishedAt: Date | null;
    let githubStatus: string;
    let codedeployStatus: string | null;

    if (status === UnifiedStatus.success) {
      durationSeconds = randomInt(240, 720);
      finishedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      githubStatus = "success";
      codedeployStatus = "Succeeded";
    } else if (status === UnifiedStatus.failed) {
      durationSeconds = randomInt(180, 480);
      finishedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      githubStatus = "success";
      codedeployStatus = "Failed";
    } else {
      durationSeconds = null;
      finishedAt = null;
      githubStatus = "in_progress";
      codedeployStatus = "InProgress";
    }

    await upsertDeployment(alex.id, {
      githubRunId: `seed_prog_deployment_${i + 1}`,
      codedeployId: status === UnifiedStatus.running ? `d-SEEDP-${String(i + 1).padStart(3, "0")}` : `d-SEEDP-${String(i + 1).padStart(3, "0")}`,
      repositoryId: repoMap[repoChoice].id,
      environmentId: env.id,
      commitMessage: COMMIT_MESSAGES[messageIndex % COMMIT_MESSAGES.length],
      branch: pickBranch(env.displayName),
      triggeredBy: TRIGGERED_BY[actorIndex % TRIGGERED_BY.length],
      githubStatus,
      codedeployStatus,
      unifiedStatus: status,
      startedAt,
      finishedAt,
      durationSeconds,
    });

    messageIndex += 1;
    actorIndex += 1;
  }

  // 8. Upsert deployment events for hand-crafted deployments 1-7 (except pending #5)
  await seedDeploymentLifecycleEvents({
    deploymentId: deployment1.id,
    startedAt: dep1Started,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "InProgress", "Pending"],
    durations: [8, 45, 23, null, null],
  });

  const deployment2 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: "seed_run_002" } });
  await seedDeploymentLifecycleEvents({
    deploymentId: deployment2.id,
    startedAt: dep2Started,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [6, 52, 18, 12, 30],
  });

  const deployment3 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: "seed_run_003" } });
  await seedDeploymentLifecycleEvents({
    deploymentId: deployment3.id,
    startedAt: dep3Started,
    statuses: ["Succeeded", "Succeeded", "Failed", "Skipped", "Skipped"],
    durations: [5, 48, 15, null, null],
    failureMessage:
      "Script at specified location: scripts/after_install.sh run as user root failed with exit code 1",
  });

  const deployment4 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: "seed_run_004" } });
  await seedDeploymentLifecycleEvents({
    deploymentId: deployment4.id,
    startedAt: dep4Started,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [7, 61, 19, 14, 28],
  });

  await seedDeploymentLifecycleEvents({
    deploymentId: deployment6.id,
    startedAt: dep6Started,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [9, 55, 22, 11, 35],
  });

  await seedDeploymentLifecycleEvents({
    deploymentId: deployment7.id,
    startedAt: dep7Started,
    statuses: ["Succeeded", "Succeeded", "Succeeded", "Succeeded", "Succeeded"],
    durations: [8, 49, 21, 13, 29],
  });

  const samDeployment2 = await prisma.deployment.findUniqueOrThrow({ where: { github_run_id: "seed_run_sam_002" } });
  await seedDeploymentLifecycleEvents({
    deploymentId: samDeployment2.id,
    startedAt: daysAgo(1, 13),
    statuses: ["Succeeded", "Succeeded", "Failed", "Skipped", "Skipped"],
    durations: [5, 45, 16, null, null],
    failureMessage:
      "Script at specified location: scripts/after_install.sh run as user root failed with exit code 1",
  });

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
  console.log("  3 repositories");
  console.log("  6 environments");
  console.log("  40 deployments");
  console.log("  ~30 deployment events");
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
