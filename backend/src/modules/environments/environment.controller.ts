import { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response";
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
} from "./environment.schema";
import * as environmentService from "./environment.service";

export async function createEnvironment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = createEnvironmentSchema.parse(req.body);
    const created = await environmentService.createOrUpdateEnvironment(req.user.id, body);
    return sendSuccess(res, created);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return sendError(res, "FORBIDDEN", "Forbidden", 403);
    }

    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") {
      return sendError(res, "GROUP_NOT_FOUND", "Deployment group not found in your AWS account", 400);
    }

    if (error instanceof Error && error.message === "AWS_NOT_CONNECTED") {
      return sendError(res, "AWS_NOT_CONNECTED", "Connect your AWS account first", 400);
    }

    if (error instanceof Error && error.message === "AWS_UNREACHABLE") {
      return sendError(res, "AWS_UNREACHABLE", "AWS service temporarily unavailable", 503);
    }

    return next(error);
  }
}

export async function getEnvironments(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const environments = await environmentService.listEnvironments(req.user.id);
    return sendSuccess(res, environments);
  } catch (error) {
    return next(error);
  }
}

export async function updateEnvironment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = updateEnvironmentSchema.parse(req.body);
    const updated = await environmentService.updateEnvironment(req.user.id, req.params.id, body);
    return sendSuccess(res, updated);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return sendError(res, "FORBIDDEN", "Forbidden", 403);
    }

    if (error instanceof Error && error.message === "IMMUTABLE_FIELDS") {
      return sendError(
        res,
        "IMMUTABLE_FIELDS",
        "CodeDeploy app and group cannot be changed. Delete and recreate.",
        400,
      );
    }

    return next(error);
  }
}

export async function deleteEnvironment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const result = await environmentService.deleteEnvironment(req.user.id, req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return sendError(res, "FORBIDDEN", "Forbidden", 403);
    }

    return next(error);
  }
}
