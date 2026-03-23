import crypto from "crypto";
import jwt from "jsonwebtoken";
import axios from "axios";
import { z } from "zod";
import { decrypt, encrypt } from "../../utils/encryption";
import { createGithubClient } from "../../utils/githubClient";
import { calculateUnifiedStatus } from "../../utils/unifiedStatus";
import {
  GithubEmail,
  GithubOauthTokenResponse,
  GithubRepo,
  GithubUser,
  GithubWorkflowRun,
  GithubWorkflowRunsResponse,
} from "./github.types";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const repoCache = new Map<string, { expiresAt: number; data: NormalizedRepo[] }>();

export function clearRepoCacheForUser(userId: string): void {
  repoCache.delete(userId);
}

const trackReposSchema = z.object({
  repos: z
    .array(
      z.object({
        github_repo_id: z.number(),
        owner: z.string().min(1),
        name: z.string().min(1),
        full_name: z.string().min(1),
        private: z.boolean(),
        default_branch: z.string().min(1),
      }),
    )
    .min(1)
    .max(20),
});

type TrackReposInput = z.infer<typeof trackReposSchema>;

type NormalizedRepo = {
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  description: string | null;
  language: string | null;
  stars: number;
};

type NormalizedRun = {
  github_run_id: string;
  repo_full_name: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  triggered_by: string;
  event: string;
  github_status: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  github_run_url: string;
  workflow_name: string;
};

function getGithubEnv() {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;
  const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI || !JWT_SECRET) {
    throw new Error("GitHub OAuth env vars are not configured");
  }

  return { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI, FRONTEND_URL, JWT_SECRET };
}

function parseLinkHeader(linkHeader: string | undefined): string | null {
  if (!linkHeader) return null;

  const parts = linkHeader.split(",").map((entry) => entry.trim());
  const next = parts.find((entry) => entry.includes('rel="next"'));
  if (!next) return null;

  const match = next.match(/<([^>]+)>/);
  return match ? match[1] : null;
}

function mapGithubStatus(run: GithubWorkflowRun): string {
  if (run.conclusion === "success") return "success";
  if (run.conclusion === "failure") return "failure";
  if (run.conclusion === "cancelled") return "cancelled";
  return run.status;
}

function normalizeRun(repoFullName: string, run: GithubWorkflowRun): NormalizedRun {
  const github_status = mapGithubStatus(run);
  const startedAt = run.run_started_at ?? run.created_at;
  const finishedAt = github_status === "success" || github_status === "failure" || github_status === "cancelled"
    ? run.updated_at
    : null;

  const durationSeconds = finishedAt
    ? Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000))
    : null;

  return {
    github_run_id: String(run.id),
    repo_full_name: repoFullName,
    branch: run.head_branch,
    commit_sha: run.head_sha,
    commit_message: run.head_commit?.message ?? "",
    triggered_by: run.actor?.login ?? "unknown",
    event: run.event,
    github_status,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    github_run_url: run.html_url,
    workflow_name: run.name,
  };
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

async function upsertRunForRepository(userId: string, repository: { id: string; full_name: string }, run: GithubWorkflowRun) {
  const normalized = normalizeRun(repository.full_name, run);
  const environment = await ensurePlaceholderEnvironment(userId, repository.id);

  const existing = await prisma.deployment.findUnique({
    where: { github_run_id: normalized.github_run_id },
    select: { codedeploy_status: true, is_rollback: true },
  });

  const unifiedStatus = calculateUnifiedStatus(
    normalized.github_status,
    existing?.codedeploy_status ?? null,
    existing?.is_rollback ?? false,
  );

  await prisma.deployment.upsert({
    where: { github_run_id: normalized.github_run_id },
    update: {
      commit_sha: normalized.commit_sha,
      branch: normalized.branch,
      commit_message: normalized.commit_message,
      triggered_by: normalized.triggered_by,
      github_status: normalized.github_status,
      github_run_url: normalized.github_run_url,
      started_at: new Date(normalized.started_at),
      finished_at: normalized.finished_at ? new Date(normalized.finished_at) : null,
      duration_seconds: normalized.duration_seconds,
      unified_status: unifiedStatus,
    },
    create: {
      user_id: userId,
      repository_id: repository.id,
      environment_id: environment.id,
      github_run_id: normalized.github_run_id,
      commit_sha: normalized.commit_sha,
      branch: normalized.branch,
      commit_message: normalized.commit_message,
      triggered_by: normalized.triggered_by,
      github_status: normalized.github_status,
      github_run_url: normalized.github_run_url,
      codedeploy_status: null,
      unified_status: unifiedStatus,
      is_rollback: false,
      started_at: new Date(normalized.started_at),
      finished_at: normalized.finished_at ? new Date(normalized.finished_at) : null,
      duration_seconds: normalized.duration_seconds,
    },
  });

  return normalized;
}

export function getTrackReposSchema() {
  return trackReposSchema;
}

export function buildGithubOAuthUrl(userId: string) {
  const { GITHUB_CLIENT_ID, GITHUB_REDIRECT_URI, JWT_SECRET } = getGithubEnv();

  const state = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "10m", algorithm: "HS256" });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "repo read:user user:email",
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubOAuthCode(code: string, state: string) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI, FRONTEND_URL, JWT_SECRET } = getGithubEnv();

  let payload: { userId: string };

  try {
    payload = jwt.verify(state, JWT_SECRET) as { userId: string };
  } catch {
    throw new Error("Invalid OAuth state");
  }

  const tokenResponse = await axios.post<GithubOauthTokenResponse>(
    "https://github.com/login/oauth/access_token",
    {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    },
    {
      headers: { Accept: "application/json" },
    },
  );

  const accessToken = tokenResponse.data.access_token;

  if (!accessToken) {
    throw new Error("Failed to obtain GitHub access token");
  }

  const github = createGithubClient(accessToken, payload.userId);

  const userResponse = await github.get<GithubUser>("/user");
  const profile = userResponse.data;

  let email = profile.email;

  if (!email) {
    const emailResponse = await github.get<GithubEmail[]>("/user/emails");
    const primary = emailResponse.data.find((entry) => entry.primary);
    email = primary?.email ?? null;
  }

  await prisma.githubConnection.upsert({
    where: { user_id: payload.userId },
    update: {
      access_token_enc: encrypt(accessToken),
      github_user_id: String(profile.id),
      github_username: profile.login,
      github_email: email,
      connected_at: new Date(),
    },
    create: {
      user_id: payload.userId,
      access_token_enc: encrypt(accessToken),
      github_user_id: String(profile.id),
      github_username: profile.login,
      github_email: email,
    },
  });

  return `${FRONTEND_URL}/onboarding/repos`;
}

async function getUserGithubToken(userId: string) {
  const connection = await prisma.githubConnection.findUnique({
    where: { user_id: userId },
    select: { access_token_enc: true, github_username: true },
  });

  if (!connection) {
    throw new Error("GitHub not connected");
  }

  return {
    token: decrypt(connection.access_token_enc),
    username: connection.github_username,
  };
}

export async function getGithubConnectionStatus(userId: string) {
  const connection = await prisma.githubConnection.findUnique({
    where: { user_id: userId },
    select: {
      github_username: true,
    },
  });

  return {
    connected: Boolean(connection),
    username: connection?.github_username ?? null,
  };
}

export async function fetchGithubRepos(userId: string): Promise<NormalizedRepo[]> {
  const cached = repoCache.get(userId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { token } = await getUserGithubToken(userId);
  const github = createGithubClient(token, userId);

  let nextUrl: string | null = "/user/repos?per_page=100&sort=updated&type=all";
  const repos: GithubRepo[] = [];

  while (nextUrl) {
    const response = await github.get<GithubRepo[]>(nextUrl);
    repos.push(...response.data);

    const linkHeader = response.headers.link as string | undefined;
    nextUrl = parseLinkHeader(linkHeader);
  }

  const normalized = repos
    .map((repo) => ({
      github_repo_id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
    }))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  repoCache.set(userId, {
    data: normalized,
    expiresAt: Date.now() + 60_000,
  });

  return normalized;
}

export async function trackRepos(userId: string, input: TrackReposInput) {
  const tracked = [];

  for (const repo of input.repos) {
    const saved = await prisma.repository.upsert({
      where: { github_repo_id: repo.github_repo_id },
      update: {
        user_id: userId,
        owner: repo.owner,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        default_branch: repo.default_branch,
        is_active: true,
        webhook_secret: crypto.randomBytes(20).toString("hex"),
      },
      create: {
        user_id: userId,
        github_repo_id: repo.github_repo_id,
        owner: repo.owner,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        default_branch: repo.default_branch,
        webhook_secret: crypto.randomBytes(20).toString("hex"),
      },
    });

    tracked.push(saved);
  }

  clearRepoCacheForUser(userId);

  return tracked;
}

export async function getTrackedRepos(userId: string) {
  const repos = await prisma.repository.findMany({
    where: {
      user_id: userId,
      is_active: true,
    },
    include: {
      _count: {
        select: {
          environments: true,
        },
      },
    },
    orderBy: {
      added_at: "desc",
    },
  });

  return repos.map((repo: (typeof repos)[number]) => ({
    id: repo.id,
    github_repo_id: repo.github_repo_id,
    owner: repo.owner,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    default_branch: repo.default_branch,
    is_active: repo.is_active,
    environment_count: repo._count.environments,
  }));
}

export async function untrackRepo(userId: string, repoId: string) {
  const updated = await prisma.repository.updateMany({
    where: {
      id: repoId,
      user_id: userId,
    },
    data: {
      is_active: false,
    },
  });

  if (updated.count === 0) {
    throw new Error("Repository not found or no access");
  }

  return { success: true };
}

export async function fetchAndStoreRuns(userId: string, repoFullName: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, limit));

  const repository = await prisma.repository.findFirst({
    where: {
      user_id: userId,
      full_name: repoFullName,
      is_active: true,
    },
    select: {
      id: true,
      full_name: true,
      owner: true,
      name: true,
    },
  });

  if (!repository) {
    throw new Error("Repository not found or no access");
  }

  const { token } = await getUserGithubToken(userId);
  const github = createGithubClient(token, userId);

  const response = await github.get<GithubWorkflowRunsResponse>(
    `/repos/${repository.owner}/${repository.name}/actions/runs`,
    {
      params: {
        per_page: safeLimit,
      },
    },
  );

  const normalizedRuns: NormalizedRun[] = [];

  for (const run of response.data.workflow_runs) {
    const normalized = await upsertRunForRepository(userId, repository, run);
    normalizedRuns.push(normalized);
  }

  return normalizedRuns;
}

export async function upsertWorkflowRunFromWebhook(payload: {
  repoFullName: string;
  githubRunId: string;
  commitSha: string;
  branch: string;
  commitMessage: string;
  triggeredBy: string;
  githubStatus: string;
  githubRunUrl: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
}) {
  const repository = await prisma.repository.findFirst({
    where: {
      full_name: payload.repoFullName,
      is_active: true,
    },
    select: {
      id: true,
      user_id: true,
      full_name: true,
    },
  });

  if (!repository) {
    return null;
  }

  const environment = await ensurePlaceholderEnvironment(repository.user_id, repository.id);
  const existing = await prisma.deployment.findUnique({
    where: { github_run_id: payload.githubRunId },
    select: { codedeploy_status: true, is_rollback: true },
  });

  const unifiedStatus = calculateUnifiedStatus(
    payload.githubStatus,
    existing?.codedeploy_status ?? null,
    existing?.is_rollback ?? false,
  );

  const deployment = await prisma.deployment.upsert({
    where: { github_run_id: payload.githubRunId },
    update: {
      commit_sha: payload.commitSha,
      branch: payload.branch,
      commit_message: payload.commitMessage,
      triggered_by: payload.triggeredBy,
      github_status: payload.githubStatus,
      github_run_url: payload.githubRunUrl,
      started_at: new Date(payload.startedAt),
      finished_at: payload.finishedAt ? new Date(payload.finishedAt) : null,
      duration_seconds: payload.durationSeconds,
      unified_status: unifiedStatus,
    },
    create: {
      user_id: repository.user_id,
      repository_id: repository.id,
      environment_id: environment.id,
      github_run_id: payload.githubRunId,
      commit_sha: payload.commitSha,
      branch: payload.branch,
      commit_message: payload.commitMessage,
      triggered_by: payload.triggeredBy,
      github_status: payload.githubStatus,
      github_run_url: payload.githubRunUrl,
      codedeploy_status: null,
      unified_status: unifiedStatus,
      is_rollback: false,
      started_at: new Date(payload.startedAt),
      finished_at: payload.finishedAt ? new Date(payload.finishedAt) : null,
      duration_seconds: payload.durationSeconds,
    },
    select: {
      id: true,
      unified_status: true,
    },
  });

  return deployment;
}
