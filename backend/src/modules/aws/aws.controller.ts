import { NextFunction, Request, Response } from "express";
import { sendError, sendSuccess } from "../../utils/response";
import * as awsService from "./aws.service";

function awsNotConnectedResponse(res: Response) {
  return sendError(res, "AWS_NOT_CONNECTED", "Connect your AWS account first", 400);
}

export async function connectAws(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const body = awsService.awsConnectSchema.parse(req.body);
    const data = await awsService.connectAwsCredentials(req.user.id, body, req);
    return sendSuccess(res, data);
  } catch (error) {
    if (error instanceof Error && error.message === "AWS_INVALID_CREDENTIALS") {
      return sendError(
        res,
        "AWS_INVALID_CREDENTIALS",
        "Could not validate AWS credentials. Check your access key and secret.",
        400,
      );
    }

    return next(error);
  }
}

export async function getAwsConnection(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const data = await awsService.getAwsStatus(req.user.id);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function deleteAwsConnection(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    const data = await awsService.disconnectAws(req.user.id, req);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    try {
      await awsService.assertAwsConnected(req.user.id);
    } catch (error) {
      if (error instanceof Error && error.message === "AWS_NOT_CONNECTED") {
        return awsNotConnectedResponse(res);
      }
      throw error;
    }

    const applications = await awsService.listApplications(req.user.id);
    return sendSuccess(res, { applications });
  } catch (error) {
    return next(error);
  }
}

export async function getDeploymentGroups(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    try {
      await awsService.assertAwsConnected(req.user.id);
    } catch (error) {
      if (error instanceof Error && error.message === "AWS_NOT_CONNECTED") {
        return awsNotConnectedResponse(res);
      }
      throw error;
    }

    const query = awsService.parseAppQuery(req.query);
    const deploymentGroups = await awsService.listDeploymentGroups(req.user.id, query.app);
    return sendSuccess(res, { deploymentGroups });
  } catch (error) {
    return next(error);
  }
}

export async function getDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    try {
      await awsService.assertAwsConnected(req.user.id);
    } catch (error) {
      if (error instanceof Error && error.message === "AWS_NOT_CONNECTED") {
        return awsNotConnectedResponse(res);
      }
      throw error;
    }

    const query = awsService.parseDeploymentQuery(req.query);
    const deployments = await awsService.listAndSyncDeployments(req.user.id, query.app, query.group, query.limit);
    return sendSuccess(res, deployments);
  } catch (error) {
    return next(error);
  }
}

export async function getDeploymentEvents(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new Error("Invalid credentials");
    }

    try {
      await awsService.assertAwsConnected(req.user.id);
    } catch (error) {
      if (error instanceof Error && error.message === "AWS_NOT_CONNECTED") {
        return awsNotConnectedResponse(res);
      }
      throw error;
    }

    const deploymentId = req.params.deploymentId;
    if (!deploymentId) {
      return sendError(res, "VALIDATION_ERROR", "deploymentId is required", 400);
    }

    const events = await awsService.getAndStoreDeploymentEvents(req.user.id, deploymentId);
    return sendSuccess(res, events);
  } catch (error) {
    return next(error);
  }
}
