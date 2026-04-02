import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { clearAccessToken, getAccessToken, refreshAccessToken } from "./auth";
import { clearCsrfToken, getCsrfToken } from "./csrf";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

export type GithubRepo = {
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

export type TrackedRepo = {
  id: string;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  is_active: boolean;
  environment_count: number;
  webhook_secret_exists?: boolean;
  added_at?: string;
  created_at?: string;
};

export type SyncStatus = {
  github_last_synced: string | null;
  aws_last_synced: string | null;
  github_rate_limit_remaining: number | null;
  github_rate_limit_reset: string | null;
};

export type GithubTokenStatus = {
  scopes: string[];
  has_repo: boolean;
  has_workflow: boolean;
  valid: boolean;
  error?: string;
};

export type RepoDeploymentStats = {
  repository_id: string;
  total_deployments: number;
  last_deployment_at: string | null;
  last_deployment_status: string | null;
};

export type EnvironmentStats = {
  environment_id: string;
  total_deployments: number;
  last_deployment_at: string | null;
  last_deployment_status: string | null;
  recent_statuses: string[];
};

export type AwsStatus = {
  connected: boolean;
  accountId?: string;
  accountAlias?: string | null;
  region?: string;
  connected_at?: string;
};

export type EnvironmentItem = {
  id: string;
  repository_id: string;
  repository_full_name: string;
  codedeploy_app: string;
  codedeploy_group: string;
  display_name: string;
  color_tag: string;
  created_at: string;
};

export type AnalyticsRange = "7d" | "30d" | "90d";

export type AuditLogEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type AccountSession = {
  id: string;
  created_at: string;
  last_used: string;
  is_current: boolean;
};

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = (config.method ?? "get").toLowerCase();
  const needsCsrf = method === "post" || method === "put" || method === "patch" || method === "delete";

  if (needsCsrf) {
    const csrfToken = await getCsrfToken();
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const errorCode = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthEndpoint =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/register") ||
      requestUrl.includes("/api/auth/logout") ||
      requestUrl.includes("/api/auth/refresh");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        clearAccessToken();
        if (onAuthFailure) {
          onAuthFailure();
        }
      }
    }

    if (status === 403 && errorCode === "INVALID_CSRF_TOKEN" && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        clearCsrfToken();
        originalRequest.headers["X-CSRF-Token"] = await getCsrfToken(true);
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

export const github = {
  async getConnection() {
    const response = await api.get("/api/github/connection");
    return response.data?.data as { connected: boolean; username: string | null };
  },
  async getRepos() {
    const response = await api.get("/api/github/repos");
    return response.data?.data as GithubRepo[];
  },
  async trackRepos(repos: Array<Pick<GithubRepo, "github_repo_id" | "owner" | "name" | "full_name" | "private" | "default_branch">>) {
    const response = await api.post("/api/github/repos/track", { repos });
    return response.data?.data as { tracked: TrackedRepo[] };
  },
  async getTrackedRepos() {
    const response = await api.get("/api/github/repos/tracked");
    return response.data?.data as TrackedRepo[];
  },
  async getRepoStats() {
    const response = await api.get("/api/github/repos/stats");
    return response.data?.data as RepoDeploymentStats[];
  },
  async getTokenStatus() {
    const response = await api.get("/api/github/token-status");
    return response.data?.data as GithubTokenStatus;
  },
  async syncRepo(repoId: string) {
    const response = await api.post(`/api/github/repos/${repoId}/sync`);
    return response.data?.data as { synced: number; message: string };
  },
  async getWebhookSecret(repoId: string) {
    const response = await api.get(`/api/github/repos/${repoId}/webhook-secret`);
    return response.data?.data as { webhook_secret: string };
  },
  async untrackRepo(repoId: string) {
    const response = await api.delete(`/api/github/repos/${repoId}/untrack`);
    return response.data?.data as { success: boolean };
  },
  async getRuns(repoFullName: string, limit = 20) {
    const response = await api.get("/api/github/runs", {
      params: {
        repo: repoFullName,
        limit,
      },
    });

    return response.data?.data;
  },
  async rerunWorkflow(runId: string) {
    const response = await api.post(`/api/github/runs/${runId}/rerun`);
    return response.data?.data as { success: boolean; message: string };
  },
  async disconnect() {
    const response = await api.delete("/api/github/connection");
    return response.data?.data as { success: boolean };
  },
  connectUrl() {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error("You must be logged in before connecting GitHub");
    }

    const url = new URL(`${baseURL}/api/auth/github`);
    url.searchParams.set("token", accessToken);
    return url.toString();
  },
};

export const aws = {
  async connect(data: { accessKeyId: string; secretAccessKey: string; region: string; accountAlias?: string }) {
    const response = await api.post("/api/settings/aws", data);
    return response.data?.data as { accountId: string; accountAlias: string | null; region: string; connected: boolean };
  },
  async getStatus() {
    const response = await api.get("/api/settings/aws");
    return response.data?.data as AwsStatus;
  },
  async disconnect() {
    const response = await api.delete("/api/settings/aws");
    return response.data?.data as { success: boolean };
  },
  async getSyncStatus() {
    const response = await api.get("/api/settings/sync-status");
    return response.data?.data as SyncStatus;
  },
  async getApplications() {
    const response = await api.get("/api/aws/applications");
    return response.data?.data as { applications: string[] };
  },
  async getDeploymentGroups(app: string) {
    const response = await api.get("/api/aws/deployment-groups", { params: { app } });
    return response.data?.data as { deploymentGroups: string[] };
  },
  async getDeployments(app: string, group: string, limit = 20) {
    const response = await api.get("/api/aws/deployments", {
      params: {
        app,
        group,
        limit,
      },
    });
    return response.data?.data;
  },
  async getDeploymentEvents(deploymentId: string) {
    const response = await api.get(`/api/aws/deployments/${deploymentId}/events`);
    return response.data?.data;
  },
};

export const environments = {
  async list() {
    const response = await api.get("/api/environments");
    return response.data?.data as EnvironmentItem[];
  },
  async create(data: {
    repository_id: string;
    codedeploy_app: string;
    codedeploy_group: string;
    display_name: string;
    color_tag: string;
  }) {
    const response = await api.post("/api/environments", data);
    return response.data?.data as EnvironmentItem;
  },
  async update(id: string, data: { display_name?: string; color_tag?: string }) {
    const response = await api.put(`/api/environments/${id}`, data);
    return response.data?.data as EnvironmentItem;
  },
  async delete(id: string) {
    const response = await api.delete(`/api/environments/${id}`);
    return response.data?.data as { success: boolean };
  },
  async stats() {
    const response = await api.get("/api/environments/stats");
    return response.data?.data as EnvironmentStats[];
  },
  async test(id: string) {
    const response = await api.post(`/api/environments/${id}/test`);
    return response.data?.data as { valid: boolean; message: string };
  },
};

export const aggregator = {
  async run() {
    const response = await api.post("/api/aggregator/run");
    return response.data?.data as {
      mergedCount: number;
      orphanedCount: number;
      staleCorrectedCount: number;
      durationMs: number;
    };
  },
};

export const deployments = {
  async list(params: {
    repo?: string;
    environment?: string;
    status?: string;
    branch?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sort_by?: "created_at" | "duration_seconds" | "unified_status";
    sort_dir?: "asc" | "desc";
    triggered_by?: string;
  }) {
    const response = await api.get("/api/deployments", { params });
    return response.data?.data as {
      deployments: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  },
  async getById(id: string) {
    const response = await api.get(`/api/deployments/${id}`);
    return response.data?.data;
  },
  async getStats() {
    const response = await api.get("/api/deployments/stats");
    return response.data?.data;
  },
  async getLastGood() {
    const response = await api.get("/api/deployments/last-good");
    return response.data?.data as {
      id: string;
      commit_sha_short: string;
      commit_message: string;
      triggered_by: string;
      finished_at: string;
      environment_display_name: string;
      repository_name: string;
    } | null;
  },
  async getEnvironmentLatest() {
    const response = await api.get("/api/deployments/environments/latest");
    return response.data?.data;
  },
  async compare(a: string, b: string) {
    const response = await api.get("/api/deployments/compare", { params: { a, b } });
    return response.data?.data;
  },
  async promote(id: string, target_environment_id: string) {
    const response = await api.post(`/api/deployments/${id}/promote`, { target_environment_id });
    return response.data?.data as { success: boolean; new_deployment_id: string; message: string };
  },
};

export const analytics = {
  async getOverview(range: AnalyticsRange = "30d") {
    const response = await api.get("/api/analytics/overview", { params: { range } });
    return response.data?.data;
  },
  async getFrequency(range: AnalyticsRange = "30d", group_by: "day" | "week" = "day") {
    const response = await api.get("/api/analytics/frequency", { params: { range, group_by } });
    return response.data?.data;
  },
  async getDurationTrend(range: AnalyticsRange = "30d", repo?: string) {
    const response = await api.get("/api/analytics/duration-trend", { params: { range, ...(repo ? { repo } : {}) } });
    return response.data?.data;
  },
  async getByRepo(range: AnalyticsRange = "30d") {
    const response = await api.get("/api/analytics/by-repo", { params: { range } });
    return response.data?.data;
  },
  async getByEnvironment(range: AnalyticsRange = "30d") {
    const response = await api.get("/api/analytics/by-environment", { params: { range } });
    return response.data?.data;
  },
  async getMttr(range: AnalyticsRange = "30d") {
    const response = await api.get("/api/analytics/mttr", { params: { range } });
    return response.data?.data;
  },
};

export const audit = {
  async list(params?: {
    action?: string;
    entity_type?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get("/api/audit", { params });
    return response.data?.data as {
      entries: AuditLogEntry[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  },
};

export const account = {
  async updateProfile(name: string) {
    const response = await api.put("/api/account/profile", { name });
    return response.data?.data as { id: string; name: string; email: string };
  },
  async updatePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    const response = await api.put("/api/account/password", payload);
    return response.data?.data as { accessToken: string; refreshToken: string };
  },
  async deleteAccount(password: string) {
    const response = await api.delete("/api/account", { data: { password } });
    return response.data?.data as { success: boolean };
  },
  async getSessions() {
    const response = await api.get("/api/account/sessions");
    return (response.data?.data ?? []) as AccountSession[];
  },
  async revokeSession(sessionId: string) {
    const response = await api.delete(`/api/account/sessions/${sessionId}`);
    return response.data?.data as { success: boolean };
  },
};
