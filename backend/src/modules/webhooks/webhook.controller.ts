import { NextFunction, Request, Response } from "express";
import * as webhookService from "./webhook.service";

export async function githubWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.header("X-Hub-Signature-256") ?? undefined;
    const event = req.header("X-GitHub-Event") ?? undefined;
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");

    const result = await webhookService.processGithubWebhook(rawBody, signature, event);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return next(error);
  }
}

export async function awsWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const result = await webhookService.processAwsWebhook(rawBody);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return next(error);
  }
}
