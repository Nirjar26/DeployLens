import axios, { AxiosInstance } from "axios";

type RateState = {
  remaining: number;
  resetAt: number;
};

const rateLimitByUser = new Map<string, RateState>();

function setRateState(userId: string, remaining: number, resetAt: number) {
  rateLimitByUser.set(userId, { remaining, resetAt });
}

export function getGithubRateLimitState(userId: string): RateState | undefined {
  return rateLimitByUser.get(userId);
}

export function createGithubClient(token: string, userId: string): AxiosInstance {
  const client = axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  client.interceptors.response.use(
    (response) => {
      const remainingRaw = response.headers["x-ratelimit-remaining"];
      const resetRaw = response.headers["x-ratelimit-reset"];

      const remaining = Number.parseInt(String(remainingRaw ?? "-1"), 10);
      const resetUnix = Number.parseInt(String(resetRaw ?? "0"), 10);

      if (!Number.isNaN(remaining) && remaining >= 0) {
        setRateState(userId, remaining, resetUnix > 0 ? resetUnix * 1000 : Date.now());
      }

      if (remaining === 0) {
        const reset = new Date(resetUnix * 1000).toISOString();
        throw new Error(`GitHub rate limit exceeded, resets at ${reset}`);
      }

      return response;
    },
    (error) => {
      const status = error?.response?.status as number | undefined;

      if (status === 401) {
        throw new Error("GitHub token invalid or expired - user must reconnect");
      }

      if (status === 404) {
        throw new Error("Repository not found or no access");
      }

      throw error;
    },
  );

  return client;
}
