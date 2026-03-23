import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { sendSuccess } from "../../utils/response";
import * as githubService from "./github.service";

const runQuerySchema = z.object({
  repo: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function startGithubOAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const url = githubService.buildGithubOAuthUrl(req.user.id);
    return res.redirect(url);
  } catch (error) {
    return next(error);
  }
}

export async function githubOAuthCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/onboarding?error=github_failed`);
  }

  try {
    await githubService.exchangeGithubOAuthCode(code, state);
    return res.redirect(`${frontendUrl}/onboarding/repos`);
  } catch {
    return res.redirect(`${frontendUrl}/onboarding?error=github_failed`);
  }
}

export async function getConnectionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const status = await githubService.getGithubConnectionStatus(req.user.id);
    return sendSuccess(res, status);
  } catch (error) {
    return next(error);
  }
}

export async function getRepos(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const repos = await githubService.fetchGithubRepos(req.user.id);
    return sendSuccess(res, repos);
  } catch (error) {
    return next(error);
  }
}

export async function trackRepos(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = githubService.getTrackReposSchema().parse(req.body);
    const tracked = await githubService.trackRepos(req.user.id, body);
    return sendSuccess(res, { tracked });
  } catch (error) {
    return next(error);
  }
}

export async function getTrackedRepos(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const repos = await githubService.getTrackedRepos(req.user.id);
    return sendSuccess(res, repos);
  } catch (error) {
    return next(error);
  }
}

export async function untrackRepo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const repoId = req.params.repoId;
    const result = await githubService.untrackRepo(req.user.id, repoId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function getRuns(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const query = runQuerySchema.parse(req.query);
    const runs = await githubService.fetchAndStoreRuns(req.user.id, query.repo, query.limit ?? 20);
    return sendSuccess(res, runs);
  } catch (error) {
    return next(error);
  }
}
