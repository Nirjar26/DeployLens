import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { emitDeploymentUpdate } from "../../utils/emitDeploymentUpdate";
import { sendError, sendSuccess } from "../../utils/response";
import * as deploymentService from "./deployment.service";

const listQuerySchema = z.object({
  repo: z.string().optional(),
  environment: z.string().optional(),
  status: z.string().optional(),
  branch: z.string().optional(),
  triggered_by: z.string().optional(),
  sort_by: z.enum(["created_at", "duration_seconds", "unified_status"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
  from: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().datetime().optional(),
  ),
  to: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().datetime().optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const compareQuerySchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
});

const promoteBodySchema = z.object({
  target_environment_id: z.string().min(1),
});

export async function getDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const query = listQuerySchema.parse(req.query);
    const result = await deploymentService.listDeployments(req.user.id, query);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function getDeploymentById(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const result = await deploymentService.getDeploymentById(req.user.id, req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof Error && error.message === "DEPLOYMENT_NOT_FOUND") {
      return sendError(res, "DEPLOYMENT_NOT_FOUND", "Deployment not found", 404);
    }

    return next(error);
  }
}

export async function getEnvironmentsLatest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const result = await deploymentService.getEnvironmentLatest(req.user.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const result = await deploymentService.getDeploymentStats(req.user.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function getLastGoodDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const result = await deploymentService.getLastGoodDeployment(req.user.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

export async function compareDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const query = compareQuerySchema.parse(req.query);
    const result = await deploymentService.compareDeployments(req.user.id, query.a, query.b);
    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof Error && error.message === "DEPLOYMENT_NOT_FOUND") {
      return sendError(res, "DEPLOYMENT_NOT_FOUND", "Deployment not found", 404);
    }

    return next(error);
  }
}

export async function promoteDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");

    const body = promoteBodySchema.parse(req.body);
    const result = await deploymentService.promoteDeployment(req.user.id, req.params.id, body.target_environment_id, req);

    void emitDeploymentUpdate(result.newDeploymentId, true).catch((error) => {
      console.error("promote emitDeploymentUpdate(new) failed", error);
    });
    void emitDeploymentUpdate(result.sourceDeploymentId, false).catch((error) => {
      console.error("promote emitDeploymentUpdate(source) failed", error);
    });

    return sendSuccess(res, {
      success: true,
      new_deployment_id: result.newDeploymentId,
      message: `Promoting to ${result.targetEnvironmentName}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DEPLOYMENT_NOT_FOUND") {
      return sendError(res, "DEPLOYMENT_NOT_FOUND", "Deployment not found", 404);
    }

    if (error instanceof Error && error.message === "NOT_PROMOTABLE") {
      return sendError(res, "NOT_PROMOTABLE", "Can only promote successful deployments", 400);
    }

    if (error instanceof Error && error.message === "TARGET_ENV_NOT_FOUND") {
      return sendError(res, "TARGET_ENV_NOT_FOUND", "Target environment not found", 404);
    }

    if (error instanceof Error && error.message === "TARGET_ENV_INVALID") {
      return sendError(res, "TARGET_ENV_INVALID", "Target environment must be different from source environment", 400);
    }

    if (error instanceof Error && error.message === "TARGET_ENV_REPO_MISMATCH") {
      return sendError(res, "TARGET_ENV_REPO_MISMATCH", "Target environment must belong to the same repository", 400);
    }

    if (error instanceof Error && error.message === "SOURCE_REVISION_NOT_FOUND") {
      return sendError(res, "SOURCE_REVISION_NOT_FOUND", "Could not resolve source deployment revision", 400);
    }

    if (error instanceof Error && error.message === "AWS_PROMOTION_FAILED") {
      return sendError(res, "AWS_PROMOTION_FAILED", "CodeDeploy returned an error. Check your AWS permissions.", 400);
    }

    return next(error);
  }
}
