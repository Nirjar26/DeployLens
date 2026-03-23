import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../utils/response";
import * as deploymentService from "./deployment.service";

const listQuerySchema = z.object({
  repo: z.string().optional(),
  environment: z.string().optional(),
  status: z.string().optional(),
  branch: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
