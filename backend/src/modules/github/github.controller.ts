import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { emitDeploymentUpdate } from "../../utils/emitDeploymentUpdate";
import { sendError, sendSuccess } from "../../utils/response";
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
    await githubService.exchangeGithubOAuthCode(code, state, req);
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
    const tracked = await githubService.trackRepos(req.user.id, body, req);
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
    const result = await githubService.untrackRepo(req.user.id, repoId, req);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function disconnectGithub(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const result = await githubService.disconnectGithub(req.user.id, req);
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

export async function rerunWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const runId = req.params.runId;
    const result = await githubService.rerunWorkflowRun(req.user.id, runId, req);
    void emitDeploymentUpdate(result.deploymentId, true).catch((error) => {
      console.error("rerun emitDeploymentUpdate failed", error);
    });

    return sendSuccess(res, {
      success: true,
      message: "Workflow re-run triggered",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DEPLOYMENT_NOT_FOUND") {
      return sendError(res, "DEPLOYMENT_NOT_FOUND", "Deployment not found", 404);
    }

    if (error instanceof Error && error.message === "RUN_NOT_FAILED") {
      return sendError(res, "RUN_NOT_FAILED", "Can only re-run failed workflow runs", 400);
    }

    if (error instanceof Error && error.message === "GITHUB_FORBIDDEN") {
      return sendError(
        res,
        "GITHUB_FORBIDDEN",
        "GitHub token does not have workflow write permission",
        400,
      );
    }

    return next(error);
  }
}

export async function getTokenStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const status = await githubService.getTokenStatus(req.user.id);
    return sendSuccess(res, status);
  } catch (error) {
    return next(error);
  }
}

export async function getRepoStats(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const stats = await githubService.getRepoStats(req.user.id);
    return sendSuccess(res, stats);
  } catch (error) {
    return next(error);
  }
}

export async function getWebhookSecret(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const secret = await githubService.getRepoWebhookSecret(req.user.id, req.params.repoId, req);
    return sendSuccess(res, secret);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return sendError(res, "FORBIDDEN", "Forbidden", 403);
    }

    return next(error);
  }
}

export async function syncRepo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const result = await githubService.syncRepo(req.user.id, req.params.repoId, req);
    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return sendError(res, "FORBIDDEN", "Forbidden", 403);
    }

    return next(error);
  }
}
