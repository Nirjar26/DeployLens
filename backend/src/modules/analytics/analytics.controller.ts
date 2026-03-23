import { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as analyticsService from "./analytics.service";

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");
    const range = analyticsService.parseRange(typeof req.query.range === "string" ? req.query.range : undefined);
    const data = await analyticsService.getOverview(req.user.id, range);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getFrequency(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");
    const range = analyticsService.parseRange(typeof req.query.range === "string" ? req.query.range : undefined);
    const groupBy = analyticsService.parseGroupBy(typeof req.query.group_by === "string" ? req.query.group_by : undefined);
    const data = await analyticsService.getFrequency(req.user.id, range, groupBy);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getDurationTrend(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");
    const range = analyticsService.parseRange(typeof req.query.range === "string" ? req.query.range : undefined);
    const repo = typeof req.query.repo === "string" && req.query.repo.length > 0 ? req.query.repo : undefined;
    const data = await analyticsService.getDurationTrend(req.user.id, range, repo);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getByRepo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");
    const range = analyticsService.parseRange(typeof req.query.range === "string" ? req.query.range : undefined);
    const data = await analyticsService.getByRepo(req.user.id, range);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getByEnvironment(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");
    const range = analyticsService.parseRange(typeof req.query.range === "string" ? req.query.range : undefined);
    const data = await analyticsService.getByEnvironment(req.user.id, range);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}

export async function getMttr(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new Error("Invalid credentials");
    const range = analyticsService.parseRange(typeof req.query.range === "string" ? req.query.range : undefined);
    const data = await analyticsService.getMttr(req.user.id, range);
    return sendSuccess(res, data);
  } catch (error) {
    return next(error);
  }
}
