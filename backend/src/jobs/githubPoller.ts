import cron from "node-cron";
import { decrypt } from "../utils/encryption";
import { createGithubClient, getGithubRateLimitState } from "../utils/githubClient";
import { calculateUnifiedStatus } from "../utils/unifiedStatus";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

type PollRateState = {
  remaining: number;
  resetAt: number;
  nextPollAt: number;
};

const pollRateByUser = new Map<string, PollRateState>();

export function getRateLimitState(userId: string): PollRateState | null {
  return pollRateByUser.get(userId) ?? null;
}

async function ensurePlaceholderEnvironment(userId: string, repositoryId: string) {
  const existing = await prisma.environment.findFirst({
    where: {
      user_id: userId,
      repository_id: repositoryId,
      codedeploy_group: "pending",
    },
  });

  if (existing) return existing;

  return prisma.environment.create({
    data: {
      user_id: userId,
      repository_id: repositoryId,
      codedeploy_app: `github-${repositoryId}`,
      codedeploy_group: "pending",
      display_name: "pending",
      color_tag: "#94a3b8",
    },
  });
}

function mapGithubStatus(run: any): string {
  if (run.conclusion === "success") return "success";
  if (run.conclusion === "failure") return "failure";
  if (run.conclusion === "cancelled") return "cancelled";
  return run.status;
}

function shouldSkipUser(userId: string) {
  const state = pollRateByUser.get(userId);
  if (!state) return false;

  if (state.remaining < 100 && state.resetAt > Date.now() && state.nextPollAt > Date.now()) {
    return true;
  }

  return false;
}

async function pollRepo(repo: any) {
  const connection = repo.user?.github_connection;
  if (!connection) return;

  const userId = repo.user_id;

  if (shouldSkipUser(userId)) {
    return;
  }

  const github = createGithubClient(decrypt(connection.access_token_enc), userId);
  const response = await github.get(`/repos/${repo.owner}/${repo.name}/actions/runs`, {
    params: { per_page: 10 },
  });

  const latestRate = getGithubRateLimitState(userId);

  if (latestRate) {
    if (latestRate.remaining < 100 && latestRate.resetAt > Date.now()) {
      pollRateByUser.set(userId, {
        remaining: latestRate.remaining,
        resetAt: latestRate.resetAt,
        nextPollAt: Date.now() + 2 * 60 * 1000,
      });
      console.warn(`GitHub rate limit low for user ${userId}, slowing poll`);
    } else {
      pollRateByUser.set(userId, {
        remaining: latestRate.remaining,
        resetAt: latestRate.resetAt,
        nextPollAt: Date.now(),
      });
    }
  }

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  for (const run of response.data.workflow_runs ?? []) {
    const startedAt = run.run_started_at ?? run.created_at;

    if (!startedAt || new Date(startedAt).getTime() < dayAgo) {
      continue;
    }

    const environment = await ensurePlaceholderEnvironment(userId, repo.id);
    const githubStatus = mapGithubStatus(run);

    const existing = await prisma.deployment.findUnique({
      where: { github_run_id: String(run.id) },
      select: { codedeploy_status: true, is_rollback: true },
    });

    const finishedAt = githubStatus === "success" || githubStatus === "failure" || githubStatus === "cancelled"
      ? run.updated_at
      : null;

    const durationSeconds = finishedAt
      ? Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000))
      : null;

    await prisma.deployment.upsert({
      where: { github_run_id: String(run.id) },
      update: {
        commit_sha: run.head_sha,
        branch: run.head_branch,
        commit_message: run.head_commit?.message ?? "",
        triggered_by: run.actor?.login ?? "unknown",
        github_status: githubStatus,
        github_run_url: run.html_url,
        started_at: new Date(startedAt),
        finished_at: finishedAt ? new Date(finishedAt) : null,
        duration_seconds: durationSeconds,
        unified_status: calculateUnifiedStatus(
          githubStatus,
          existing?.codedeploy_status ?? null,
          existing?.is_rollback ?? false,
        ),
      },
      create: {
        user_id: userId,
        repository_id: repo.id,
        environment_id: environment.id,
        github_run_id: String(run.id),
        commit_sha: run.head_sha,
        branch: run.head_branch,
        commit_message: run.head_commit?.message ?? "",
        triggered_by: run.actor?.login ?? "unknown",
        github_status: githubStatus,
        github_run_url: run.html_url,
        codedeploy_status: null,
        unified_status: calculateUnifiedStatus(githubStatus, null, false),
        is_rollback: false,
        started_at: new Date(startedAt),
        finished_at: finishedAt ? new Date(finishedAt) : null,
        duration_seconds: durationSeconds,
      },
    });
  }
}

export function startGithubPoller(): void {
  if (process.env.NODE_ENV === "test") {
    console.log("GitHub poller disabled in test environment");
    return;
  }

  cron.schedule("*/30 * * * * *", async () => {
    try {
      const activeRepos = await prisma.repository.findMany({
        where: { is_active: true },
        include: {
          user: {
            select: {
              github_connection: {
                select: {
                  access_token_enc: true,
                },
              },
            },
          },
        },
      });

      for (const repo of activeRepos) {
        try {
          await pollRepo(repo);
        } catch (error) {
          console.error(`GitHub poll failed for ${repo.full_name}`, error);
        }
      }
    } catch (error) {
      console.error("GitHub poller cycle failed", error);
    }
  });
}
