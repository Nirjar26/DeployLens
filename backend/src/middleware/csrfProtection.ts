import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/response";

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

const CSRF_COOKIE_NAME = "_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function shouldSkipCsrf(req: Request) {
  return req.path.startsWith("/api/webhooks/");
}

function ensureCsrfSecret(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof existing === "string" && existing.length >= 32) {
    return existing;
  }

  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return token;
}

function equalsSafe(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (shouldSkipCsrf(req)) {
    return next();
  }

  const token = ensureCsrfSecret(req, res);
  req.csrfToken = () => token;

  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const incoming = req.get("x-csrf-token");
  if (!incoming || !equalsSafe(incoming, token)) {
    return sendError(res, "INVALID_CSRF_TOKEN", "Invalid CSRF token", 403);
  }

  return next();
}